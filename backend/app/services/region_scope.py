"""Request-local country scope. Ingestion/cache always retain all countries."""

import json
import math
import re
import hashlib
from collections import OrderedDict
from dataclasses import dataclass
from threading import Lock
from contextvars import ContextVar
from functools import lru_cache
from pathlib import Path

EU_COUNTRIES = frozenset(
    "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split()
)
request_country = ContextVar("request_country", default=None)
request_custom_scope = ContextVar("request_custom_scope", default=None)


@dataclass
class CustomScope:
    features: list
    shapes: dict


_custom_scopes = OrderedDict()
_scope_lock = Lock()


def compile_geometry(geometry):
    polygons = (
        [geometry["coordinates"]]
        if geometry["type"] == "Polygon"
        else geometry["coordinates"]
    )
    points = [point for polygon in polygons for ring in polygon for point in ring]
    return polygons, (
        min(p[0] for p in points),
        min(p[1] for p in points),
        max(p[0] for p in points),
        max(p[1] for p in points),
    )


def point_in_shape(shape, point):
    polygons, (west, south, east, north) = shape
    return (
        west <= point[0] <= east
        and south <= point[1] <= north
        and any(
            in_ring(point, polygon[0])
            and not any(in_ring(point, hole) for hole in polygon[1:])
            for polygon in polygons
        )
    )


def register_custom_scope(data):
    """Validate uploaded boundaries and cache a content-addressed, request-local scope."""
    encoded = json.dumps(data, allow_nan=False, separators=(",", ":")).encode()
    if (
        len(encoded) > 2097152
        or not isinstance(data, dict)
        or data.get("type") != "FeatureCollection"
    ):
        raise ValueError("Invalid FeatureCollection (maximum 2 MB)")
    features = data.get("features")
    if not isinstance(features, list) or not 1 <= len(features) <= 200:
        raise ValueError("Expected 1–200 regions")
    vertices = 0
    ids = set()
    for feature in features:
        if not isinstance(feature, dict) or feature.get("type") != "Feature":
            raise ValueError("Invalid feature")
        geometry = feature.get("geometry") or {}
        if not isinstance(geometry, dict) or geometry.get("type") not in (
            "Polygon",
            "MultiPolygon",
        ):
            raise ValueError("Expected Polygon or MultiPolygon")
        polygons = (
            [geometry.get("coordinates")]
            if geometry["type"] == "Polygon"
            else geometry.get("coordinates")
        )
        if not isinstance(polygons, list) or not polygons:
            raise ValueError("Empty geometry")
        for polygon in polygons:
            if not isinstance(polygon, list) or not polygon:
                raise ValueError("Empty polygon")
            for ring in polygon:
                if not isinstance(ring, list) or len(ring) < 4:
                    raise ValueError("Invalid ring")
                for point in ring:
                    vertices += 1
                    if (
                        vertices > 100000
                        or not isinstance(point, list)
                        or len(point) < 2
                        or any(
                            type(v) not in (int, float) or not math.isfinite(v)
                            for v in point
                        )
                        or abs(point[0]) > 180
                        or abs(point[1]) > 90
                    ):
                        raise ValueError("Invalid WGS84 coordinates")
                if (
                    ring[0][:2] != ring[-1][:2]
                    or abs(
                        sum(
                            ring[i - 1][0] * point[1] - point[0] * ring[i - 1][1]
                            for i, point in enumerate(ring)
                        )
                    )
                    < 1e-12
                ):
                    raise ValueError("Ring must be closed with nonzero area")
        properties = feature.get("properties") or {}
        if not isinstance(properties, dict):
            raise ValueError("Invalid properties")
        region_id = properties.get("id")
        if (
            not isinstance(region_id, str)
            or not region_id
            or region_id in ids
            or not isinstance(properties.get("name"), str)
            or not properties["name"].strip()
        ):
            raise ValueError("Expected unique IDs and names")
        ids.add(region_id)
    scope_id = hashlib.sha256(encoded).hexdigest()
    scope = CustomScope(
        features=features,
        shapes={
            feature["properties"]["id"]: compile_geometry(feature["geometry"])
            for feature in features
        },
    )
    with _scope_lock:
        _custom_scopes[scope_id] = scope
        _custom_scopes.move_to_end(scope_id)
        while len(_custom_scopes) > 64:
            _custom_scopes.popitem(last=False)
    return scope_id


def get_custom_scope(scope_id):
    with _scope_lock:
        scope = _custom_scopes.get(scope_id)
        if scope:
            _custom_scopes.move_to_end(scope_id)
        return scope


@lru_cache(maxsize=1)
def boundaries():
    path = (
        Path(__file__).resolve().parents[3] / "frontend/public/regions/eu-adm1.geojson"
    )
    return json.loads(path.read_text(encoding="utf-8"))["features"]


def station_point(station):
    location = station.get("location")
    if isinstance(location, str):
        match = re.fullmatch(r"\s*\(([^,]+),([^,]+)\)\s*", location)
        coordinates = match.groups() if match else None
    elif isinstance(location, dict):
        coordinates = location.get("coordinates")
    else:
        coordinates = None
    try:
        lng, lat = float(coordinates[0]), float(coordinates[1])
        if (
            math.isfinite(lng)
            and math.isfinite(lat)
            and abs(lng) <= 180
            and abs(lat) <= 90
        ):
            return lng, lat
    except (TypeError, ValueError, IndexError):
        pass
    return None


def in_ring(point, ring):
    x, y = point
    inside = False
    previous = ring[-1]
    for current in ring:
        xi, yi = current[:2]
        xj, yj = previous[:2]
        cross = (x - xi) * (yj - yi) - (y - yi) * (xj - xi)
        if (
            abs(cross) < 1e-10
            and min(xi, xj) <= x <= max(xi, xj)
            and min(yi, yj) <= y <= max(yi, yj)
        ):
            return True
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        previous = current
    return inside


@lru_cache(maxsize=1024)
def region_shape(region_id):
    feature = next(
        item for item in boundaries() if item["properties"]["id"] == region_id
    )
    geometry = feature["geometry"]
    polygons = (
        [geometry["coordinates"]]
        if geometry["type"] == "Polygon"
        else geometry["coordinates"]
    )
    points = [point for polygon in polygons for ring in polygon for point in ring]
    box = (
        min(p[0] for p in points),
        min(p[1] for p in points),
        max(p[0] for p in points),
        max(p[1] for p in points),
    )
    return polygons, box


@lru_cache(maxsize=50000)
def point_in_region(region_id, point):
    polygons, (west, south, east, north) = region_shape(region_id)
    if not (west <= point[0] <= east and south <= point[1] <= north):
        return False
    return any(
        in_ring(point, polygon[0])
        and not any(in_ring(point, hole) for hole in polygon[1:])
        for polygon in polygons
    )


@lru_cache(maxsize=50000)
def point_in_country(country, point):
    return any(
        point_in_region(feature["properties"]["id"], point)
        for feature in boundaries()
        if feature["properties"]["country"] == country
    )


def scope_stations(stations):
    custom = request_custom_scope.get()
    if custom is not None:
        return [
            station
            for station in stations
            if (point := station_point(station))
            and any(point_in_shape(shape, point) for shape in custom.shapes.values())
        ]
    country = request_country.get()
    if not country:
        return stations
    return [
        station
        for station in stations
        if (point := station_point(station)) and point_in_country(country, point)
    ]
