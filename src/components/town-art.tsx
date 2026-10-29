'use client';
import { useMemo, useState } from 'react';
import { buildTownLayout, BLOCK_SIZE } from '@/lib/town-layout.mjs';
import { selectMapLabels } from '@/lib/map-labels.mjs';
import { streetPath } from '@/lib/map-rendering.mjs';
import { churchConstructionLevel } from '@/lib/layout.mjs';
import type { City, CityWorld, MapSelection } from '@/lib/types';

const groundY = (y: number) => y * 0.7;

function HouseArt({
  color,
  seed,
  selected,
  isCreator,
  level = 1,
  civilRole,
}: {
  color: string;
  seed: number;
  selected: boolean;
  isCreator?: boolean;
  level?: number;
  civilRole?: string | null;
}) {
  // 1. Castelo do Criador (Nível 99 ou @lucasgfr26)
  if (isCreator) {
    return (
      <g className="creator-castle">
        <ellipse cx="0" cy="4" rx="28" ry="14" fill={selected ? '#f5d26b' : '#dfcea7'} stroke="#b88f40" strokeWidth="1.5" />
        <path d="M-12 12L-6 16H6L12 12Z" fill="#bfa77b" />
        <path d="M-16-16L0-8L16-16V6L0 12L-16 6Z" fill="#fdfbf7" stroke="#8b7355" strokeWidth=".8" />
        <path d="M0-8L16-16V6L0 12Z" fill="#e8ded1" stroke="#8b7355" strokeWidth=".8" />
        <path d="M-22-6V10L-16 6V-8Z" fill="#ece4d8" stroke="#8b7355" strokeWidth=".7" />
        <path d="M-22-6L-19-24L-16-8Z" fill="#ffd700" stroke="#b8860b" strokeWidth=".8" />
        <path d="M-19-24V-29M-21-27H-17" stroke="#b8860b" strokeWidth="1.2" />
        <path d="M16 6V-8L22-6V10Z" fill="#d9cbba" stroke="#8b7355" strokeWidth=".7" />
        <path d="M16-8L19-24L22-6Z" fill="#ffd700" stroke="#b8860b" strokeWidth=".8" />
        <path d="M19-24V-29M17-27H21" stroke="#b8860b" strokeWidth="1.2" />
        <path d="M-10-14L0-20L10-14V-6L0 0L-10-6Z" fill="#fffdfa" stroke="#8b7355" strokeWidth=".8" />
        <path d="M0-20L10-14V-6L0 0Z" fill="#ebdcc8" stroke="#8b7355" strokeWidth=".8" />
        <path d="M-12-20L0-36L12-20Z" fill="#ffd700" stroke="#b8860b" strokeWidth="1" />
        <path d="M-4 10V2Q0 -3 4 2V10Z" fill="#2d1804" />
        <path d="M-3 9V3Q0 -1 3 3V9Z" fill="#5c3818" />
        <path d="M-3 -10V-15Q0 -17 3 -15V-10Z" fill="#fef08a" stroke="#b8860b" strokeWidth=".5" />
        <path d="M-14 -1L-12 -2V2L-14 3Z" fill="#fef08a" />
        <path d="M12 -2L14 -1V3L12 2Z" fill="#fef08a" />
        <g transform="translate(0, -42)">
          <path d="M-8 3L-6 -7L-2 -3L0 -9L2 -3L6 -7L8 3Z" fill="#ffd700" stroke="#b8860b" strokeWidth="0.8" />
          <circle cx="0" cy="-10" r="1.8" fill="#ef4444" />
          <circle cx="-6" cy="-8" r="1.3" fill="#3b82f6" />
          <circle cx="6" cy="-8" r="1.3" fill="#3b82f6" />
        </g>
      </g>
    );
  }

  // 2. Sobreposição Presidencial (Palácio Presidencial da República)
  if (civilRole === 'presidente') {
    return (
      <g className="presidential-palace">
        {/* Espelho d'água frontal reluzente */}
        <ellipse cx="0" cy="5" rx="26" ry="12" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.2" opacity="0.85" />
        <ellipse cx="0" cy="5" rx="20" ry="8" fill="#bae6fd" opacity="0.5" />
        {/* Colunata frontal nobre */}
        <path d="M-18-18L0-24L18-18V4L0 9L-18 4Z" fill="#f8fafc" stroke="#64748b" strokeWidth=".8" />
        <path d="M0-24L18-18V4L0 9Z" fill="#e2e8f0" stroke="#64748b" strokeWidth=".8" />
        {/* Colunas brancas */}
        <rect x="-14" y="-12" width="2" height="14" fill="#ffffff" stroke="#94a3b8" strokeWidth=".4" />
        <rect x="-8" y="-14" width="2" height="16" fill="#ffffff" stroke="#94a3b8" strokeWidth=".4" />
        <rect x="-2" y="-15" width="2" height="18" fill="#ffffff" stroke="#94a3b8" strokeWidth=".4" />
        <rect x="4" y="-15" width="2" height="18" fill="#ffffff" stroke="#94a3b8" strokeWidth=".4" />
        <rect x="10" y="-14" width="2" height="16" fill="#ffffff" stroke="#94a3b8" strokeWidth=".4" />
        {/* Platibanda moderna dourada */}
        <path d="M-20-18L0-26L20-18L0-14Z" fill="#ffd700" stroke="#b8860b" strokeWidth=".8" />
        {/* Mastro central com a Bandeira do Brasil */}
        <line x1="0" y1="-26" x2="0" y2="-44" stroke="#475569" strokeWidth="1.5" />
        <rect x="0" y="-44" width="12" height="8" fill="#16a34a" />
        <polygon points="6,-44 12,-40 6,-36 0,-40" fill="#facc15" />
        <circle cx="6" cy="-40" r="2.2" fill="#1d4ed8" />
      </g>
    );
  }

  // 3. Sobreposição de Governador (Palácio dos Governadores)
  if (civilRole === 'governador') {
    return (
      <g className="governors-palace">
        {/* Escadaria nobre em pedra */}
        <ellipse cx="0" cy="4" rx="22" ry="11" fill={selected ? '#f5d26b' : '#e2e8f0'} stroke="#94a3b8" strokeWidth="1" />
        <path d="M-10 8L0 12L10 8V10L0 14L-10 10Z" fill="#cbd5e1" />
        {/* Sobrado imponente de 3 pavimentos */}
        <path d="M-14-22L0-28L14-22V2L0 7L-14 2Z" fill="#fefce8" stroke="#ca8a04" strokeWidth=".8" />
        <path d="M0-28L14-22V2L0 7Z" fill="#fef08a" stroke="#ca8a04" strokeWidth=".8" />
        {/* Telhado nobre com frontão e mansarda */}
        <path d="M-16-22L0-34L16-22L0-18Z" fill="#854d0e" />
        {/* Janelas duplas clássicas dos pavimentos */}
        <rect x="-10" y="-18" width="3" height="5" rx="1.5" fill="#1e3a8a" />
        <rect x="-4" y="-20" width="3" height="5" rx="1.5" fill="#1e3a8a" />
        <rect x="2" y="-20" width="3" height="5" rx="1.5" fill="#1e3a8a" />
        <rect x="8" y="-18" width="3" height="5" rx="1.5" fill="#1e3a8a" />
        {/* Mastro com bandeira estadual */}
        <line x1="-12" y1="-22" x2="-12" y2="-38" stroke="#475569" strokeWidth="1.2" />
        <rect x="-12" y="-38" width="9" height="6" fill="#2563eb" />
        <polygon points="-8,-38 -3,-35 -8,-32" fill="#f8fafc" />
      </g>
    );
  }

  // 4. Sobreposição de Prefeito (Palacete Municipal da Prefeitura)
  if (civilRole === 'prefeito') {
    return (
      <g className="mayor-mansion">
        {/* Calçada em mosaico português */}
        <ellipse cx="0" cy="3" rx="18" ry="9" fill={selected ? '#f5d26b' : '#f1f5f9'} stroke="#64748b" strokeWidth="1" />
        {/* Mansão colonial com frontão */}
        <path d="M-12-16L0-21L12-16V4L0 8L-12 4Z" fill="#fffbeb" stroke="#b45309" strokeWidth=".8" />
        <path d="M0-21L12-16V4L0 8Z" fill="#fde68a" stroke="#b45309" strokeWidth=".8" />
        <path d="M-14-16L0-28L14-16L0-12Z" fill="#9a3412" />
        {/* Brasão cívico no frontão */}
        <circle cx="0" cy="-16" r="2.5" fill="#f59e0b" stroke="#78350f" strokeWidth=".5" />
        {/* Mastro da bandeira municipal */}
        <line x1="8" y1="-16" x2="8" y2="-32" stroke="#475569" strokeWidth="1.2" />
        <rect x="8" y="-32" width="8" height="5" fill="#0d9488" />
        <circle cx="12" cy="-29.5" r="1.2" fill="#fef08a" />
      </g>
    );
  }

  // 5. ESTÁGIO 5 (Nível 30+): Palacete do Sacristão
  if (level >= 30) {
    return (
      <g className="house-stage-5">
        <ellipse cx="0" cy="3" rx="17" ry="9" fill={selected ? '#f5d26b' : '#fef3c7'} stroke="#b88f40" strokeWidth="1.2" />
        <path d="M-11-15L0-20L11-15V4L0 8L-11 4Z" fill="#fafaf9" stroke="#78716c" strokeWidth=".7" />
        <path d="M0-20L11-15V4L0 8Z" fill="#e7e5e4" stroke="#78716c" strokeWidth=".7" />
        <path d="M-13-15L0-26L13-15L0-11Z" fill="#78350f" />
        {/* Oratório nobre no muro */}
        <rect x="-8" y="0" width="3" height="5" rx="1.5" fill="#fef08a" stroke="#b8860b" strokeWidth=".5" />
        {/* Chave de ouro / estandarte dourado no topo */}
        <line x1="0" y1="-26" x2="0" y2="-34" stroke="#b8860b" strokeWidth="1" />
        <circle cx="0" cy="-35" r="2" fill="#ffd700" stroke="#b8860b" strokeWidth=".8" />
        <path d="M-1 -33H1M-1 -31H1" stroke="#b8860b" strokeWidth=".8" />
      </g>
    );
  }

  // 6. ESTÁGIO 4 (Nível 25-29): Solar da Fé
  if (level >= 25) {
    return (
      <g className="house-stage-4">
        <ellipse cx="0" cy="2" rx="16" ry="8" fill={selected ? '#f5d26b' : '#e7e5e4'} stroke="#78716c" strokeWidth=".8" />
        <path d="M-10-13L0-18L10-13V4L0 8L-10 4Z" fill={color} stroke="#44403c" strokeWidth=".6" />
        <path d="M0-18L10-13V4L0 8Z" fill="#f5f5f4" stroke="#44403c" strokeWidth=".6" />
        <path d="M-12-13L0-23L12-13L0-9Z" fill="#991b1b" />
        {/* Cruzeiro de madeira no quintal */}
        <line x1="-12" y1="2" x2="-12" y2="-8" stroke="#78350f" strokeWidth="1.2" />
        <line x1="-14" y1="-5" x2="-10" y2="-5" stroke="#78350f" strokeWidth="1" />
      </g>
    );
  }

  // 7. ESTÁGIO 3 (Nível 15-24): Sobrado Paroquial
  if (level >= 15) {
    return (
      <g className="house-stage-3">
        <ellipse cx="0" cy="2" rx="15" ry="8" fill={selected ? '#f5d26b' : '#8eae78'} stroke={selected ? '#b88f40' : 'none'} strokeWidth={selected ? '1.2' : '0'} />
        {/* Sobrado de 2 andares mais alto */}
        <path d="M-9-15L0-20L9-15V5L0 9L-9 5Z" fill={color} stroke="#50654f" strokeWidth=".6" />
        <path d="M0-20L9-15V5L0 9Z" fill="#fdfbf7" stroke="#50654f" strokeWidth=".6" />
        <path d="M-11-15L0-25L11-15L0-11Z" fill="#b45309" />
        {/* Varanda de ferro no andar superior */}
        <rect x="-6" y="-8" width="12" height="4" fill="#cbd5e1" stroke="#334155" strokeWidth=".5" />
        <line x1="-6" y1="-4" x2="6" y2="-4" stroke="#334155" strokeWidth="1" />
      </g>
    );
  }

  // 8. ESTÁGIO 2 (Nível 5-14): Casa Colonial
  if (level >= 5) {
    const roof = ['#b45309', '#9a3412', '#78350f', '#854d0e'][seed % 4];
    return (
      <g className="house-stage-2">
        <ellipse cx="0" cy="2" rx="15" ry="8" fill={selected ? '#f5d26b' : '#8eae78'} stroke={selected ? '#b88f40' : 'none'} strokeWidth={selected ? '1.2' : '0'} />
        <path d="M-8-10L1-5V8L-8 3Z" fill="#ffffff" stroke="#64748b" strokeWidth=".6" />
        <path d="M1-5L9-10V3L1 8Z" fill="#f8fafc" stroke="#64748b" strokeWidth=".6" />
        <path d="M-11-11L0-22L12-13L1-4Z" fill={roof} />
        {/* Janelas azuis coloniais */}
        <rect x="-6" y="-3" width="3" height="4" fill="#0284c7" />
        <rect x="4" y="-1" width="3" height="4" fill="#0284c7" />
      </g>
    );
  }

  // 9. ESTÁGIO 1 (Nível 1-4): Casinha da Vila
  const roof = ['#ad7054', '#6e8392', '#bb975e', '#806d83'][seed % 4];
  return (
    <g className="house-stage-1">
      <ellipse cx="0" cy="2" rx="14" ry="7" fill={selected ? '#f5d26b' : '#8eae78'} stroke={selected ? '#b88f40' : 'none'} strokeWidth={selected ? '1.2' : '0'} />
      <path d="M-8-10L1-5V8L-8 3Z" fill={color} stroke="#50654f" strokeWidth=".55" />
      <path d="M1-5L9-10V3L1 8Z" fill="#e3cf9e" stroke="#50654f" strokeWidth=".55" />
      <path d="M-11-11L0-22L12-13L1-4Z" fill={roof} />
      <path d="M-11-11L0-22L-1-12L-8-5Z" fill="#d5ae75" />
      <path d="M-4-5V0L-1 2V-3Z" fill="#fff1b4" />
      <path d="M4-1L7-3V2L4 4Z" fill="#fff1b4" />
      <path d="M-7-1L-4 1V6L-7 4Z" fill="#6e6653" />
      {seed % 3 === 0 && <path d="M5-20V-27L8-25V-17Z" fill="#9b8269" />}
    </g>
  );
}

function ChurchArt({
  level,
  selected,
  hasPriest,
  festivalActive,
}: {
  level: number;
  selected: boolean;
  hasPriest?: boolean;
  festivalActive?: boolean;
}) {
  const tower = 31 + level * 6;
  return (
    <g>
      {/* Pátio da matriz */}
      <ellipse cx="0" cy="9" rx="34" ry="19" fill={selected ? '#f3d47c' : '#dfd4b2'} stroke={selected ? '#b88f40' : '#c4b68f'} strokeWidth=".9" />

      {/* Bandeirinhas festivas caso o Prefeito tenha ativado a Festa do Padroeiro */}
      {festivalActive && (
        <g className="parish-festival-flags" pointerEvents="none">
          <path d="M-28 6Q-14 0 0 4Q14 0 28 6" fill="none" stroke="#64748b" strokeWidth=".6" strokeDasharray="1,1" />
          <polygon points="-24,4 -21,1 -18,4" fill="#ef4444" />
          <polygon points="-16,2 -13,-1 -10,2" fill="#eab308" />
          <polygon points="-8,2 -5,-1 -2,2" fill="#3b82f6" />
          <polygon points="4,2 7,-1 10,2" fill="#10b981" />
          <polygon points="12,3 15,0 18,3" fill="#ec4899" />
          <polygon points="20,5 23,2 26,5" fill="#f97316" />
        </g>
      )}

      {/* Nave da igreja */}
      <path d="M-14-24L5-15V19L-14 10Z" fill="#f8edce" stroke="#8b8a6a" strokeWidth=".65" />
      <path d="M5-15L25-28V6L5 19Z" fill="#dfcea7" stroke="#8b8a6a" strokeWidth=".65" />
      <path d="M-18-24L-1-40L29-28L5-12Z" fill="#ae7452" />
      <path d="M-18-24L-1-40L5-26L-14-16Z" fill="#cda46c" />

      {/* Torre sineira */}
      <path d={`M-25 ${-tower}L-13 ${-tower + 5}V12L-25 6Z`} fill="#faf0d3" stroke="#8b8a6a" strokeWidth=".6" />
      <path d={`M-13 ${-tower + 5}L-5 ${-tower}V7L-13 12Z`} fill="#d9c49b" />
      <path d={`M-29 ${-tower}L-18 ${-tower - 17}L-1 ${-tower}L-13 ${-tower + 6}Z`} fill="#b38d4e" />

      {/* CRUZ NO TOPO DA TORRE */}
      {hasPriest ? (
        // Cruz Reluzente Sagrada com Aura Dourada (Presença de Pároco Aprovado)
        <g className="sacred-golden-cross">
          {/* Aura e halos de luz celestial */}
          <circle cx="-18" cy={-tower - 22} r="16" fill="#fef08a" opacity="0.3" />
          <circle cx="-18" cy={-tower - 22} r="10" fill="#ffd700" opacity="0.5" />
          <circle cx="-18" cy={-tower - 22} r="5" fill="#ffffff" opacity="0.8" />
          {/* Cruz dourada brilhante */}
          <path d={`M-18 ${-tower - 29}V${-tower - 15}M-24 ${-tower - 24}H-12`} stroke="#ffd700" strokeWidth="2.8" />
          <path d={`M-18 ${-tower - 28}V${-tower - 16}M-23 ${-tower - 24}H-13`} stroke="#ffffff" strokeWidth="1.2" />
        </g>
      ) : (
        // Cruz tradicional
        <path d={`M-18 ${-tower - 28}V${-tower - 16}M-23 ${-tower - 24}H-13`} stroke="#765a30" strokeWidth="2.2" />
      )}

      {/* Portal principal */}
      <path d="M-7 12V1Q-2-8 3 2V17Z" fill="#687f83" />
      {/* Estola pastoral de dignidade caso a matriz tenha sacerdote */}
      {hasPriest && (
        <path d="M-5 11L-2 4L0 12L2 4L5 11" fill="none" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" />
      )}

      <ellipse cx="-4" cy="-18" rx="3.6" ry="4.5" fill="#d2b057" />
      {level >= 3 && <path d="M14-21L20-24V-15L14-12Z" fill="#fff2bc" />}
    </g>
  );
}

function TreeArt({ variant }: { variant: number }) {
  const color = ['#62885a', '#799c68', '#8f9b64'][variant];
  return (
    <g>
      <ellipse cx="3" cy="3" rx="9" ry="4" fill="#486d4c" opacity=".18" />
      <path d="M0 2V-12" stroke="#8b7956" strokeWidth="2" />
      <path d="M-10-11L-3-22L8-19L12-10L2-6Z" fill={color} />
      <path d="M-10-11L-3-22L0-12L2-6Z" fill="#7ca06b" />
    </g>
  );
}

export default function TownArt({
  exits,
  city,
  world,
  layout,
  bounds,
  unitPixels,
  selectedHouse,
  selectedParish,
  onInspect,
}: {
  exits: number[];
  city: City;
  world: CityWorld;
  layout: ReturnType<typeof buildTownLayout>;
  bounds: { left: number; right: number; top: number; bottom: number };
  unitPixels: number;
  selectedHouse: number | null;
  selectedParish: number | null;
  onInspect: (selection: MapSelection) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const blockPixels = BLOCK_SIZE * unitPixels;
  const inView = (x: number, y: number, margin = 110) =>
    x > bounds.left - margin && x < bounds.right + margin && groundY(y) > bounds.top - margin && groundY(y) < bounds.bottom + margin;

  const depth = useMemo(
    () =>
      [
        ...layout.trees.map((tree, i) => ({ kind: 'tree' as const, x: tree.x, y: tree.y, key: `tree-${i}`, tree })),
        ...layout.plots.map(plot => ({ kind: 'house' as const, x: plot.x, y: plot.y, key: `house-${plot.house.id}`, plot })),
        ...layout.districts.map(district => ({ kind: 'church' as const, x: district.x, y: district.y, key: `church-${district.parish.id}`, district })),
      ].sort((a, b) => a.y - b.y),
    [layout]
  );

  const visibleDepth = depth.filter(item => (item.kind === 'tree' ? blockPixels >= 45 && inView(item.x, item.y) : inView(item.x, item.y)));
  const fullStreetDrawing = useMemo(() => streetPath(layout.streets), [layout]);
  const exitPaths = useMemo(
    () =>
      [...new Set(exits)].map(angle => {
        const start = { x: Math.cos(angle) * (layout.radius + 4), y: Math.sin(angle) * (layout.radius + 4) };
        const node = layout.nodes.reduce(
          (nearest, p) => (Math.hypot(p.x - start.x, p.y - start.y) < Math.hypot(nearest.x - start.x, nearest.y - start.y) ? p : nearest),
          layout.nodes[0] ?? { x: 0, y: 0 }
        );
        return { angle, path: `M${start.x} ${groundY(start.y)}L${node.x} ${groundY(start.y)}L${node.x} ${groundY(node.y)}` };
      }),
    [exits, layout]
  );
  const viewWidth = (bounds.right - bounds.left) * unitPixels;
  const viewHeight = (bounds.bottom - bounds.top) * unitPixels;

  const parishLabels = selectMapLabels(
    layout.districts
      .filter(d => inView(d.x, d.y) && (blockPixels >= 95 || d.parish.id === selectedParish || d.parish.id === hovered))
      .map(d => ({
        id: d.parish.id,
        district: d,
        x: (d.x - bounds.left) * unitPixels,
        y: (groundY(d.y) - bounds.top) * unitPixels - (65 + churchConstructionLevel(d.houses) * 6) * unitPixels - 34,
        width: 152,
        height: 32,
        priority: d.parish.id === selectedParish ? 100000 : d.parish.id === hovered ? 99999 : d.houses * 10 + 1,
      })),
    { width: viewWidth, height: viewHeight, padding: 6 }
  );

  const sectorLabels =
    blockPixels >= 18 && blockPixels < 95 && layout.districts.length > 8
      ? selectMapLabels(
          layout.sectors.map((sector, i) => ({
            id: sector.key,
            x: ((sector.districts.reduce((sum, d) => sum + d.x, 0) / sector.districts.length) - bounds.left) * unitPixels,
            y: (groundY(sector.districts.reduce((sum, d) => sum + d.y, 0) / sector.districts.length) - bounds.top) * unitPixels,
            width: 112,
            height: 24,
            priority: sector.districts.length,
            title: `Bairro ${i + 1}`,
            count: sector.districts.length,
          })),
          { width: viewWidth, height: viewHeight, padding: 12, limit: 12 }
        )
      : [];

  const inspect = (parish: CityWorld['parishes'][number]) => onInspect({ city, parish });

  return (
    <g className="living-town" data-town={city.code} data-town-houses={world.houses.length} data-town-layout="blocks">
      {city.code === 4399999 && (
        <g className="creator-island-base" pointerEvents="none">
          {/* Águas do oceano e ondas concêntricas */}
          <ellipse cx="0" cy="0" rx="420" ry="290" fill="#1b4965" opacity=".45" />
          <ellipse cx="0" cy="0" rx="370" ry="255" fill="#2d6a8f" opacity=".60" />
          <ellipse cx="0" cy="0" rx="320" ry="220" fill="#5fa8d3" opacity=".75" />
          {/* Faixa de areia dourada de praia da Ilha */}
          <ellipse cx="0" cy="0" rx="270" ry="185" fill="#f6d585" stroke="#dfb658" strokeWidth="5" />
          {/* Relevo verde tropical e colina central */}
          <ellipse cx="0" cy="0" rx="235" ry="160" fill="#6ba072" stroke="#4d7c54" strokeWidth="2.5" />
        </g>
      )}
      {blockPixels >= 16 &&
        layout.cells
          .filter(c => inView(c.col * BLOCK_SIZE, c.row * BLOCK_SIZE, BLOCK_SIZE))
          .map(cell => {
            const isSelectedParish = cell.parish_id && (cell.parish_id === selectedParish || cell.parish_id === hovered);
            const fill = isSelectedParish
              ? '#d9cf98'
              : cell.core
                ? ['#b9cb93', '#b1c48d', '#c1cf9c'][Math.abs(cell.col + cell.row) % 3]
                : ['#a7bc88', '#a0b583', '#aec190'][Math.abs(cell.col + cell.row) % 3];
            return (
              <rect
                key={`${cell.col}:${cell.row}`}
                x={cell.col * BLOCK_SIZE - 90}
                y={groundY(cell.row * BLOCK_SIZE - 90)}
                width="180"
                height={180 * 0.7}
                rx="16"
                fill={fill}
                stroke={isSelectedParish ? '#c59b38' : cell.core ? '#d8d2ad' : 'none'}
                strokeWidth={isSelectedParish ? '2.2' : cell.core ? '1' : '0'}
                opacity={isSelectedParish ? '.78' : '.58'}
              />
            );
          })}

      <g strokeLinejoin="round" strokeLinecap="round" fill="none">
        <g data-town-road-count={layout.streets.length}>
          <path d={fullStreetDrawing} stroke="#d9d8bd" strokeWidth="14" />
          <path d={fullStreetDrawing} stroke="#89948b" strokeWidth="8.5" />
          {blockPixels >= 45 && <path d={fullStreetDrawing} stroke="#eee7d2" strokeWidth=".85" strokeDasharray="5 7" />}
        </g>
        {exitPaths.map(({ angle, path }) => (
          <g key={angle}>
            <path d={path} stroke="#d9d8bd" strokeWidth="12" />
            <path d={path} stroke="#89948b" strokeWidth="7" />
          </g>
        ))}
      </g>

      {blockPixels >= 24 &&
        layout.districts
          .filter(d => inView(d.x, d.y))
          .map(d => (
            <g key={d.parish.id} pointerEvents="none">
              <ellipse cx={d.x} cy={groundY(d.y + 8)} rx="54" ry="36" fill="#d8cfa8" opacity=".55" />
              <ellipse cx={d.x} cy={groundY(d.y + 12)} rx="41" ry="28" fill="#eae1bf" stroke="#cbbd93" strokeWidth="1" />
              <path d={`M${d.x} ${groundY(d.y + 38)}V${groundY(d.y + BLOCK_SIZE / 2)}`} stroke="#d9d1ae" strokeWidth="7" />
              <path d={`M${d.x - BLOCK_SIZE / 2} ${groundY(d.y)}H${d.x + BLOCK_SIZE / 2}`} stroke="#d9d1ae" strokeWidth="4" opacity=".65" />
            </g>
          ))}

      {layout.plaza && (
        <g transform={`translate(${layout.plaza.x},${groundY(layout.plaza.y)})`} pointerEvents="none">
          <rect x="-68" y="-42" width="136" height="84" rx="24" fill="#becb9c" />
          <ellipse rx="34" ry="24" fill="#ece1be" stroke="#c9bd99" strokeWidth="2" />
          <ellipse cy="-1" rx="15" ry="10" fill="#d0b98a" />
          <ellipse cy="-3" rx="11" ry="7" fill="#70aaa8" />
          <path d="M0-3V-15" stroke="#c5dfe1" strokeWidth="2" />
          <path d="M-5-10Q0-21 5-10" fill="none" stroke="#c5dfe1" strokeWidth="1.5" />
          <path d="M-25 8L-12 13M13 13L26 8" stroke="#97774f" strokeWidth="3" />
        </g>
      )}

      {visibleDepth.map(item =>
        item.kind === 'tree' ? (
          blockPixels >= 45 && (
            <g key={item.key} transform={`translate(${item.tree.x},${groundY(item.tree.y)})`} pointerEvents="none">
              <TreeArt variant={item.tree.variant} />
            </g>
          )
        ) : item.kind === 'house' ? (
          <g
            key={item.key}
            transform={`translate(${item.plot.x},${groundY(item.plot.y)})`}
            className="town-home"
            data-house-id={item.plot.house.id}
            role="button"
            tabIndex={0}
            aria-label={`Casa de ${item.plot.house.display_name}`}
            onClick={event => {
              event.stopPropagation();
              onInspect({ city, house: item.plot.house, parish: world.parishes.find(p => p.id === item.plot.house.parish_id) });
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onInspect({ city, house: item.plot.house, parish: world.parishes.find(p => p.id === item.plot.house.parish_id) });
              }
            }}
          >
            <title>@{item.plot.house.username}</title>
            {blockPixels >= 60 || selectedHouse === item.plot.house.id ? (
              <HouseArt
                color={item.plot.house.color}
                seed={item.plot.house.id}
                selected={selectedHouse === item.plot.house.id}
                isCreator={item.plot.house.role === 'criador' || item.plot.house.level === 99 || item.plot.house.username === 'lucasgfr26'}
                level={item.plot.house.level ?? 1}
                civilRole={item.plot.house.civil_role}
              />
            ) : (
              <path d="M-9 4V-7L0-14L10-7V4Z" fill={item.plot.house.color} />
            )}
            {(selectedHouse === item.plot.house.id || blockPixels >= 175) && (
              <g transform={`translate(0,${-26}) scale(${1 / unitPixels})`} pointerEvents="none">
                <rect
                  x="-50"
                  y="-14"
                  width="100"
                  height="16"
                  rx="8"
                  fill={
                    item.plot.house.role === 'criador' || item.plot.house.level === 99 || item.plot.house.username === 'lucasgfr26'
                      ? '#2d1804e6'
                      : item.plot.house.civil_role === 'presidente'
                      ? '#064e3be6'
                      : item.plot.house.civil_role === 'governador'
                      ? '#1e3a8ae6'
                      : item.plot.house.civil_role === 'prefeito'
                      ? '#78350fe6'
                      : '#18384be6'
                  }
                  stroke={
                    item.plot.house.role === 'criador' || item.plot.house.civil_role
                      ? '#f5c84c'
                      : item.plot.house.is_founder
                      ? '#38bdf8'
                      : '#f5c84c'
                  }
                  strokeWidth={item.plot.house.role === 'criador' || item.plot.house.civil_role ? '1.5' : '.9'}
                />
                <text x="0" y="-3" textAnchor="middle" fill="#fffdf7" fontSize="9.5" fontWeight="700">
                  {item.plot.house.role === 'criador' || item.plot.house.level === 99 || item.plot.house.username === 'lucasgfr26'
                    ? '👑 @'
                    : item.plot.house.civil_role === 'presidente'
                    ? '🇧🇷 @'
                    : item.plot.house.civil_role === 'governador'
                    ? '🏛️ @'
                    : item.plot.house.civil_role === 'prefeito'
                    ? '🏙️ @'
                    : item.plot.house.is_founder
                    ? '⭐ @'
                    : '@'}
                  {item.plot.house.username.slice(0, 14)}
                </text>
              </g>
            )}
          </g>
        ) : (
          <g
            key={item.key}
            transform={`translate(${item.district.x},${groundY(item.district.y)})`}
            className="town-church"
            data-parish-id={item.district.parish.id}
            role="button"
            tabIndex={0}
            aria-label={item.district.parish.name}
            onPointerEnter={event => {
              if (!event.buttons) setHovered(item.district.parish.id);
            }}
            onPointerLeave={event => {
              if (!event.buttons) setHovered(null);
            }}
            onFocus={() => setHovered(item.district.parish.id)}
            onBlur={() => setHovered(null)}
            onClick={event => {
              event.stopPropagation();
              inspect(item.district.parish);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                inspect(item.district.parish);
              }
            }}
          >
            <title>
              {item.district.parish.name} · {item.district.houses} casas
            </title>
            {blockPixels >= 38 ? (
              <ChurchArt
                level={churchConstructionLevel(item.district.houses)}
                selected={selectedParish === item.district.parish.id}
                hasPriest={item.district.parish.has_approved_priest}
                festivalActive={city.patron_festival_active}
              />
            ) : (
              <g>
                <path d="M-13 10V-23L0-36L15-23V10Z" fill="#f3e7c8" />
                <path d="M-17-23L0-41L19-23Z" fill="#af8050" />
                <path d="M0-55V-40M-6-49H6" stroke="#715b35" strokeWidth="3" />
              </g>
            )}
          </g>
        )
      )}

      {sectorLabels.map(label => (
        <g
          key={label.id}
          transform={`translate(${bounds.left + label.x / unitPixels},${bounds.top + label.y / unitPixels}) scale(${1 / unitPixels})`}
          pointerEvents="none"
        >
          <rect x="-56" y="0" width="112" height="24" rx="7" fill="#fbf5e7" stroke="#d5c69e" strokeWidth=".8" opacity=".95" />
          <text x="0" y="16" textAnchor="middle" fill="#34524b" fontSize="10" fontWeight="600">
            {label.title} · {label.count} paróquias
          </text>
        </g>
      ))}

      {parishLabels.map(label => {
        const name = label.district.parish.name.replace(/^Paróquia\s+/i, '');
        const words = name.split(' ');
        const lines = [''];
        for (const word of words) {
          const i = lines.length - 1;
          if ((lines[i] + ' ' + word).trim().length <= 24) lines[i] = (lines[i] + ' ' + word).trim();
          else if (lines.length < 2) lines.push(word);
          else {
            lines[i] = lines[i].slice(0, 22) + '…';
            break;
          }
        }
        return (
          <g
            key={label.id}
            transform={`translate(${bounds.left + label.x / unitPixels},${bounds.top + label.y / unitPixels}) scale(${1 / unitPixels})`}
            pointerEvents="none"
          >
            <rect x="-76" width="152" height="32" rx="6" fill="#fff9e8" stroke="#cbbb91" strokeWidth="1" />
            {lines.map((line, i) => (
              <text key={i} y={13 + i * 12} textAnchor="middle" fill="#294b48" fontSize="10" fontWeight="700">
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </g>
  );
}
