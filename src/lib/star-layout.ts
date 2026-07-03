export type StarLayoutInput = {
  id: string;
  groupKey: string;
  companyName: string;
  status?: string;
};

export type StarLayoutOutput = {
  id: string;
  x: number;
  y: number;
  size: number;
  label: string;
  groupKey: string;
  aggregateCount?: number;
  hiddenIds?: string[];
};

type ClusterLayoutOptions = {
  width?: number;
  height?: number;
  cellWidth?: number;
  cellHeight?: number;
  maxVisiblePerCluster?: number;
};

export function getStableHash(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getShortLabel(companyName: string): string {
  const cleanName = companyName
    .replace(/\s+/g, "")
    .replace(/[()（）[\]【】]/g, "")
    .replace(/(有限公司|有限责任公司|股份|集团|控股|科技|技术|信息|网络|中国|北京|上海|深圳|广州|杭州|南京|成都|重庆|武汉|西安|香港)/g, "");
  const ascii = cleanName.match(/[A-Za-z0-9]+/g)?.join("");
  if (ascii && ascii.length >= 2) return ascii.slice(0, 2).toUpperCase();
  return (cleanName || companyName).slice(0, 2);
}

export function buildClusterLayout(
  items: StarLayoutInput[],
  options: ClusterLayoutOptions = {},
): StarLayoutOutput[] {
  const width = options.width ?? 1040;
  const height = options.height ?? 480;
  const cellWidth = options.cellWidth ?? 66;
  const cellHeight = options.cellHeight ?? 58;
  const maxVisiblePerCluster = options.maxVisiblePerCluster ?? 12;
  const groups = groupItems(items);
  const centers = buildClusterCenters(groups.length, width, height);
  const clusterColumns = getClusterColumnCount(groups.length);
  const clusterRows = Math.ceil(Math.max(1, groups.length) / clusterColumns);

  return groups.flatMap(([groupKey, groupItemsForKey], groupIndex) => {
    const center = centers[groupIndex];
    const sortedItems = [...groupItemsForKey].sort((a, b) => getStableHash(a.id) - getStableHash(b.id));
    const visibleItems = sortedItems.slice(0, maxVisiblePerCluster);
    const hiddenItems = sortedItems.slice(maxVisiblePerCluster);
    const slots = hiddenItems.length > 0 ? [...visibleItems, null] : visibleItems;
    const clusterWidth = Math.max(220, width / clusterColumns - 52);
    const clusterHeight = Math.max(190, height / clusterRows - 48);
    const maxCols = Math.max(2, Math.floor(clusterWidth / cellWidth));
    const cols = Math.max(1, Math.min(maxCols, Math.ceil(Math.sqrt(slots.length * 1.08))));
    const rows = Math.max(1, Math.ceil(slots.length / cols));
    const horizontalStep = Math.min(cellWidth, Math.max(58, clusterWidth / Math.max(1, cols - 0.25)));
    const verticalStep = Math.min(cellHeight, Math.max(68, clusterHeight / Math.max(1, rows - 0.35)));

    return slots.map((item, slotIndex) => {
      const col = slotIndex % cols;
      const row = Math.floor(slotIndex / cols);
      const rowOffset = row % 2 === 0 ? 0 : horizontalStep * 0.5;
      const hash = item ? getStableHash(item.id) : getStableHash(`${groupKey}-aggregate`);
      const jitterX = ((hash % 100) / 100 - 0.5) * 10;
      const jitterY = (((hash >>> 8) % 100) / 100 - 0.5) * 8;
      const baseX = center.x + (col - (cols - 1) / 2) * horizontalStep + rowOffset - horizontalStep * 0.25;
      const baseY = center.y + (row - (rows - 1) / 2) * verticalStep;
      const size = item?.status === "offer" ? 48 : item?.status ? 44 : 40;

      if (!item) {
        return {
          id: `${groupKey}-aggregate`,
          x: clamp(baseX + jitterX, 38, width - 38),
          y: clamp(baseY + jitterY, 40, height - 40),
          size: 52,
          label: `+${hiddenItems.length}`,
          groupKey,
          aggregateCount: hiddenItems.length,
          hiddenIds: hiddenItems.map((hidden) => hidden.id),
        };
      }

      return {
        id: item.id,
        x: clamp(baseX + jitterX, 34, width - 34),
        y: clamp(baseY + jitterY, 36, height - 36),
        size,
        label: getShortLabel(item.companyName),
        groupKey,
      };
    });
  });
}

function groupItems(items: StarLayoutInput[]) {
  const groups = new Map<string, StarLayoutInput[]>();
  items.forEach((item) => {
    const key = item.groupKey || "其他";
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  });
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

function buildClusterCenters(groupCount: number, width: number, height: number) {
  if (groupCount <= 1) return [{ x: width * 0.48, y: height * 0.52 }];
  if (groupCount <= 2) {
    return [
      { x: width * 0.3, y: height * 0.52 },
      { x: width * 0.7, y: height * 0.48 },
    ];
  }

  const columns = getClusterColumnCount(groupCount);
  const rows = Math.ceil(groupCount / columns);
  return Array.from({ length: groupCount }, (_, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const y =
      rows === 2
        ? row === 0
          ? height * 0.36
          : height * 0.74
        : ((row + 0.5) / rows) * height;
    return {
      x: ((col + 0.5) / columns) * width,
      y,
    };
  });
}

function getClusterColumnCount(groupCount: number) {
  if (groupCount <= 3) return groupCount;
  if (groupCount <= 8) return 4;
  return 5;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
