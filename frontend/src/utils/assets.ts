export function humanizeAssetKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function stationIdForAsset(asset?: string | null): string | null {
  if (!asset) {
    return null;
  }

  if (asset.startsWith('TS-')) {
    return asset;
  }

  if (asset.startsWith('TR-')) {
    return `TS-${asset.slice(3)}`;
  }

  return null;
}

export function routeForAsset(asset?: string | null): string | null {
  if (!asset || asset === 'SYSTEM') {
    return null;
  }

  if (asset.startsWith('TR-')) {
    return `/transformers/${asset}`;
  }

  if (asset.startsWith('TS-')) {
    return `/substations/${asset}`;
  }

  if (asset.startsWith('REGION-') || asset.startsWith('REG-')) {
    return `/regions/${asset}`;
  }

  return null;
}
