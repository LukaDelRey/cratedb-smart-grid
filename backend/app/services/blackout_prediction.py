def calculate_blackout_probability(stations):

    if not stations:
        return 0

    critical = 0

    for station in stations:

        thermal = station.get("thermal") or {}
        electrical = station.get("electrical") or {}

        if thermal.get("oil_temp_c", 0) > 90 or electrical.get("current_a", 0) > 500:
            critical += 1

    return round((critical / len(stations)) * 100, 1)
