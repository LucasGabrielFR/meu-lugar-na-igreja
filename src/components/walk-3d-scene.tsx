'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { City, CityWorld } from '@/lib/types';
import { cachedTownLayout } from '@/lib/map-rendering.mjs';

export type CharacterGender = 'male' | 'female';
export type CharacterRole =
  | 'criador'
  | 'leigo'
  | 'coroinha'
  | 'acolito'
  | 'cerimoniario'
  | 'ministro'
  | 'sacristao'
  | 'prefeito'
  | 'governador'
  | 'presidente'
  | 'padre';

export interface WalkCharacterConfig {
  gender: CharacterGender;
  role: CharacterRole;
  username: string;
}

// Materials and colors by role
function getRoleClothing(role: CharacterRole, gender: CharacterGender) {
  switch (role) {
    case 'criador':
      return { torso: 0x1e1b4b, legs: 0x0f172a, sash: 0xf59e0b, robe: 0x312e81, collar: null, hat: 0xf59e0b };
    case 'padre':
      // Batina preta oficial com colarinho clerical branco
      return { torso: 0x111113, legs: 0x111113, sash: null, robe: 0x111113, collar: 0xffffff, hat: 0x111113 };
    case 'presidente':
      // Terno executivo sem clérgima com faixa presidencial verde e amarela
      return { torso: 0x0f172a, legs: 0x020617, sash: 0x16a34a, robe: null, collar: null, hat: null };
    case 'governador':
      // Terno azul nobre sem clérgima com faixa estadual azul
      return { torso: 0x1e3a5f, legs: 0x0f172a, sash: 0x2563eb, robe: null, collar: null, hat: null };
    case 'prefeito':
      // Terno cinza chumbo sem clérgima com faixa municipal dourada
      return { torso: 0x334155, legs: 0x1e293b, sash: 0xd97706, robe: null, collar: null, hat: null };
    case 'sacristao':
      // Veste de serviço sóbria cinza grafite e calça escura
      return { torso: 0x334155, legs: 0x0f172a, sash: null, robe: null, collar: null, hat: null };
    case 'ministro':
      // Jaleco branco com botões pretos e calça escura
      return { torso: 0xf8fafc, legs: 0x1e293b, sash: null, robe: null, collar: null, hat: null };
    case 'cerimoniario':
      // Túnica preta solene de fundo com sobrepeliz rendada branca
      return { torso: 0x18181b, legs: 0x18181b, sash: null, robe: 0xffffff, collar: null, hat: null };
    case 'acolito':
      // Túnica branca pura com cíngulo cinza na cintura
      return { torso: 0xf8fafc, legs: 0xf8fafc, sash: null, robe: 0xf8fafc, collar: null, hat: null };
    case 'coroinha':
      // Túnica vermelha litúrgica com sobrepeliz branca rendada
      return { torso: 0x991b1b, legs: 0x991b1b, sash: null, robe: 0xffffff, collar: null, hat: null };
    case 'leigo':
    default:
      // Roupa social normal e modesta sem clérgima ou faixas clericais
      return gender === 'female'
        ? { torso: 0x0284c7, legs: 0x1e293b, sash: null, robe: null, collar: null, hat: null }
        : { torso: 0x2563eb, legs: 0x334155, sash: null, robe: null, collar: null, hat: null };
  }
}

// Side signboard texture with parish name
function createParishSignTexture(name: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(0, 0, 512, 128);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#b45309';
    ctx.strokeRect(3, 3, 506, 122);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⛪ ' + name, 256, 64, 480);
  }
  return new THREE.CanvasTexture(canvas);
}

// Procedural Church Lace Texture for Surplices (Sobrepelizes)
function createLaceTexture(type: 'coroinha' | 'cerimoniario'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 512, 140);
  const isCer = type === 'cerimoniario';

  if (isCer) {
    // SÃO PEDRO PARAMENTARIA STYLE:
    // 1. Semi-translucent fine lace openwork lattice (filé de renda litúrgica)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    for (let x = 0; x < 512; x += 6) {
      for (let y = 10; y < 118; y += 6) {
        if ((x + y) % 12 === 0) {
          ctx.fillRect(x + 1, y + 1, 2.5, 2.5);
        }
      }
    }

    // 2. White embroidered baroque floral scrollwork & acanthus leaves
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;

    const segW = 128;
    for (let s = 0; s < 4; s++) {
      const ox = s * segW;
      const cx = ox + segW / 2;

      // Scrolling vines
      ctx.beginPath();
      ctx.moveTo(ox + 8, 30);
      ctx.bezierCurveTo(ox + 35, 12, ox + 45, 55, cx - 18, 50);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ox + segW - 8, 30);
      ctx.bezierCurveTo(ox + segW - 35, 12, ox + segW - 45, 55, cx + 18, 50);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ox + 12, 90);
      ctx.bezierCurveTo(ox + 40, 110, ox + 48, 65, cx - 16, 75);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ox + segW - 12, 90);
      ctx.bezierCurveTo(ox + segW - 40, 110, ox + segW - 48, 65, cx + 16, 75);
      ctx.stroke();

      // White floral petals
      ctx.fillStyle = '#ffffff';
      for (const [px, py] of [[ox + 25, 36], [ox + segW - 25, 36], [ox + 28, 86], [ox + segW - 28, 86]]) {
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Central Crowned Golden Monogram (Paramentaria São Pedro)
      // Royal Liturgical Crown on top
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(cx - 15, 22, 30, 4);

      // Crown peaks with pearls
      ctx.beginPath();
      ctx.moveTo(cx - 15, 22);
      ctx.lineTo(cx - 13, 10);
      ctx.lineTo(cx - 7, 18);
      ctx.lineTo(cx, 8);
      ctx.lineTo(cx + 7, 18);
      ctx.lineTo(cx + 13, 10);
      ctx.lineTo(cx + 15, 22);
      ctx.closePath();
      ctx.fill();

      // Pearls on crown peaks
      ctx.fillStyle = '#fef08a';
      for (const p of [cx - 13, cx, cx + 13]) {
        ctx.beginPath();
        ctx.arc(p, p === cx ? 7 : 9, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Golden Monogram "AM" / Ecclesiastical Insignia
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Left A leg
      ctx.beginPath();
      ctx.moveTo(cx - 12, 85);
      ctx.lineTo(cx - 6, 34);
      ctx.lineTo(cx, 55);
      ctx.lineTo(cx + 6, 34);
      ctx.lineTo(cx + 12, 85);
      ctx.stroke();

      // M intertwining strokes
      ctx.beginPath();
      ctx.moveTo(cx - 16, 52);
      ctx.quadraticCurveTo(cx - 4, 42, cx - 2, 78);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + 16, 52);
      ctx.quadraticCurveTo(cx + 4, 42, cx + 2, 78);
      ctx.stroke();

      // Golden cross in monogram
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cx - 8, 54, 16, 3.5);
      ctx.fillRect(cx - 1.8, 47, 3.6, 18);

      // Gold shimmer highlights
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx - 6, 55, 12, 1.8);
      ctx.fillRect(cx - 1, 48, 2, 16);
    }

    // 4. Top White Connecting Hem & Bottom White Hem
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 8);
    ctx.fillRect(0, 124, 512, 16);

    // Fine gold piping on bottom hem
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(0, 123, 512, 2.5);
  } else {
    // COROINHA STYLE (Traditional white floral lace with scalloped arches)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    for (let x = 0; x < 512; x += 8) {
      for (let y = 14; y < 105; y += 8) {
        if ((x + y) % 16 === 0) {
          ctx.fillRect(x + 1, y + 1, 3, 3);
        }
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 12);

    const archWidth = 64;
    for (let x = 0; x < 512; x += archWidth) {
      const cx = x + archWidth / 2;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, 38, 26, Math.PI, 0, false);
      ctx.stroke();

      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, 38, 20, Math.PI, 0, false);
      ctx.stroke();

      // White Latin Cross
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 2.5, 26, 5, 28);
      ctx.fillRect(cx - 8, 34, 16, 5);

      // Rosette
      ctx.beginPath();
      ctx.arc(cx, 64, 4, 0, Math.PI * 2);
      ctx.fill();

      // Gothic connector
      ctx.beginPath();
      ctx.arc(x, 46, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Scalloped bottom hem
    for (let x = 0; x < 512; x += 16) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + 8, 108, 8, 0, Math.PI, false);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x + 8, 120, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

export default function Walk3DScene({
  city,
  world,
  character,
  onExit,
  currentAction,
  targetParishId,
  autoWalk = false,
}: {
  city: City;
  world: CityWorld;
  character: WalkCharacterConfig;
  onExit: () => void;
  currentAction: string | null;
  targetParishId?: number;
  autoWalk?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // References to avoid tearing down the 3D scene on prop updates
  const currentActionRef = useRef<string | null>(currentAction);
  currentActionRef.current = currentAction;

  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  const characterRef = useRef(character);
  characterRef.current = character;

  // Callback to update clothing/hat/face without restarting scene
  const updateAppearanceRef = useRef<((config: WalkCharacterConfig) => void) | null>(null);

  useEffect(() => {
    if (updateAppearanceRef.current) {
      updateAppearanceRef.current(character);
    }
  }, [character.gender, character.role]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const isCreatorIsland = city.code === 4399999;
    // Sky color matching sunset / dusk
    scene.background = new THREE.Color(isCreatorIsland ? 0x1e293b : 0x2d1b2e);
    scene.fog = new THREE.FogExp2(isCreatorIsland ? 0x1e293b : 0x2d1b2e, 0.0011);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.5, 3000);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    container.appendChild(renderer.domElement);

    // 3. Lights (Warm natural sunlight and ambient)
    const hemiLight = new THREE.HemisphereLight(0xfff1dc, 0x3d3040, 1.1);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.35);
    dirLight.position.set(120, 220, 90);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 800;
    dirLight.shadow.camera.left = -400;
    dirLight.shadow.camera.right = 400;
    dirLight.shadow.camera.top = 400;
    dirLight.shadow.camera.bottom = -400;
    scene.add(dirLight);

    // 4. Layout & Terrain Ground (Exact color matching 2D map: #a7bc88 / #b9cb93)
    const layout: any = cachedTownLayout(world);
    const floorSize = Math.max(2400, layout.radius * 3);
    const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMat = new THREE.MeshLambertMaterial({ color: isCreatorIsland ? 0x6ba072 : 0xa7bc88 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // If Creator Island: Sandy Beach & Ocean water ring
    if (isCreatorIsland) {
      const beachGeo = new THREE.RingGeometry(240, 320, 32);
      const beachMat = new THREE.MeshLambertMaterial({ color: 0xf6d585 });
      const beachMesh = new THREE.Mesh(beachGeo, beachMat);
      beachMesh.rotation.x = -Math.PI / 2;
      beachMesh.position.y = 0.05;
      scene.add(beachMesh);

      const oceanGeo = new THREE.PlaneGeometry(3500, 3500);
      const oceanMat = new THREE.MeshLambertMaterial({ color: 0x2d6a8f, transparent: true, opacity: 0.9 });
      const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
      oceanMesh.rotation.x = -Math.PI / 2;
      oceanMesh.position.y = -0.05;
      scene.add(oceanMesh);
    }

    // 5. Streets and Sidewalks (Exact colors from 2D map: #d9d8bd curbs, #89948b asphalt, #eee7d2 dash)
    const streetMat = new THREE.MeshLambertMaterial({ color: 0x89948b });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xeee7d2 });
    const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0xd9d8bd });

    for (const street of layout.streets) {
      const dx = street.bx - street.ax;
      const dz = street.by - street.ay;
      const length = Math.hypot(dx, dz);
      const angle = Math.atan2(dz, dx);
      const mx = (street.ax + street.bx) / 2;
      const mz = (street.ay + street.by) / 2;

      // Asphalt
      const sGeo = new THREE.BoxGeometry(length, 0.2, 16);
      const sMesh = new THREE.Mesh(sGeo, streetMat);
      sMesh.position.set(mx, 0.1, mz);
      sMesh.rotation.y = -angle;
      sMesh.receiveShadow = true;
      scene.add(sMesh);

      // Sidewalk borders
      const swGeo = new THREE.BoxGeometry(length, 0.32, 3);
      const sw1 = new THREE.Mesh(swGeo, sidewalkMat);
      sw1.position.set(mx, 0.16, mz + 9.5);
      sw1.rotation.y = -angle;
      scene.add(sw1);

      const sw2 = new THREE.Mesh(swGeo, sidewalkMat);
      sw2.position.set(mx, 0.16, mz - 9.5);
      sw2.rotation.y = -angle;
      scene.add(sw2);

      // Dash lines
      const dashGeo = new THREE.BoxGeometry(Math.max(2, length * 0.4), 0.22, 0.6);
      const dash = new THREE.Mesh(dashGeo, lineMat);
      dash.position.set(mx, 0.12, mz);
      dash.rotation.y = -angle;
      scene.add(dash);
    }

    // 6. ALL PARISH CHURCHES (Faithfully matching 2D ChurchArt: #f8edce walls, #ae7452 terracotta tile, #dfd4b2 adro)
    const churchWallMat = new THREE.MeshLambertMaterial({ color: 0xf8edce });
    const churchShadowWallMat = new THREE.MeshLambertMaterial({ color: 0xdfcea7 });
    const churchRoofMat = new THREE.MeshLambertMaterial({ color: 0xae7452 });
    const churchRoofRidgeMat = new THREE.MeshLambertMaterial({ color: 0xcda46c });
    const churchTowerWallMat = new THREE.MeshLambertMaterial({ color: 0xfaf0d3 });
    const churchTowerRoofMat = new THREE.MeshLambertMaterial({ color: 0xb38d4e });
    const churchBronzeCrossMat = new THREE.MeshLambertMaterial({ color: 0x765a30 });
    const churchPortalMat = new THREE.MeshLambertMaterial({ color: 0x687f83 });
    const churchOculusMat = new THREE.MeshLambertMaterial({ color: 0xd2b057 });
    const adroMat = new THREE.MeshLambertMaterial({ color: 0xdfd4b2 });
    const adroWalkMat = new THREE.MeshLambertMaterial({ color: 0xd9d1ae });

    layout.districts.forEach((district: any) => {
      const churchGroup = new THREE.Group();
      churchGroup.position.set(district.x, 0, district.y);

      // A. Adro / Churchyard paving: Stepped oval stone terrace like in 2D
      const adroBase = new THREE.Mesh(new THREE.CylinderGeometry(44, 46, 0.5, 32), adroMat);
      adroBase.position.set(0, 0.25, 4);
      adroBase.receiveShadow = true;
      churchGroup.add(adroBase);

      const adroTop = new THREE.Mesh(new THREE.CylinderGeometry(36, 38, 0.35, 32), new THREE.MeshLambertMaterial({ color: 0xeae1bf }));
      adroTop.position.set(0, 0.55, 6);
      adroTop.receiveShadow = true;
      churchGroup.add(adroTop);

      // Wide stone pathway connecting adro to the sidewalk
      const walkPath = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 36), adroWalkMat);
      walkPath.position.set(0, 0.35, 32);
      walkPath.receiveShadow = true;
      churchGroup.add(walkPath);

      // B. Main Nave (Colonial cream walls #f8edce)
      const naveGeo = new THREE.BoxGeometry(30, 20, 48);
      const nave = new THREE.Mesh(naveGeo, churchWallMat);
      nave.position.set(0, 10, 0);
      nave.castShadow = true;
      nave.receiveShadow = true;
      churchGroup.add(nave);

      // Main Gabled Terracotta Tile Roof (#ae7452)
      const roofGeo = new THREE.ConeGeometry(24, 12, 4);
      const roof = new THREE.Mesh(roofGeo, churchRoofMat);
      roof.position.set(0, 26, 0);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      churchGroup.add(roof);

      // C. Bell Tower (positioned on front-left side like in 2D art, #faf0d3)
      const towerGeo = new THREE.BoxGeometry(12, 42, 12);
      const tower = new THREE.Mesh(towerGeo, churchTowerWallMat);
      tower.position.set(-15, 21, 14);
      tower.castShadow = true;
      churchGroup.add(tower);

      // Tower Belfry Pyramid Roof (#b38d4e)
      const belfryRoofGeo = new THREE.ConeGeometry(9, 16, 4);
      const belfryRoof = new THREE.Mesh(belfryRoofGeo, churchTowerRoofMat);
      belfryRoof.position.set(-15, 50, 14);
      belfryRoof.rotation.y = Math.PI / 4;
      belfryRoof.castShadow = true;
      churchGroup.add(belfryRoof);

      // Belfry Opening / Window
      const belfryWindow = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 12.2), new THREE.MeshBasicMaterial({ color: 0x33281e }));
      belfryWindow.position.set(-15, 36, 14);
      churchGroup.add(belfryWindow);

      // Tall Bronze Cross atop Bell Tower (#765a30)
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.8, 0.8), churchBronzeCrossMat);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8, 0.8), churchBronzeCrossMat);
      crossH.position.set(-15, 62, 14);
      crossV.position.set(-15, 61, 14);
      churchGroup.add(crossH);
      churchGroup.add(crossV);

      // D. Facade Portal: Arched wood door (#687f83) and golden circular oculus (#d2b057)
      const portal = new THREE.Mesh(new THREE.BoxGeometry(7, 12, 1.0), churchPortalMat);
      portal.position.set(0, 6, 24.5);
      churchGroup.add(portal);

      const oculus = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.3, 16), churchOculusMat);
      oculus.position.set(0, 15, 24.5);
      oculus.rotation.x = Math.PI / 2;
      churchGroup.add(oculus);

      // E. Parish Name Plaque: Placed elegantly on the SIDE of the path (x = 18, z = 32)
      // so it never blocks the walking path or church entrance!
      const signTexture = createParishSignTexture(district.parish.name);
      const signMat = new THREE.MeshBasicMaterial({ map: signTexture, transparent: true });
      const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), signMat);
      signMesh.position.set(16, 3, 32);
      signMesh.rotation.y = -0.25; // angled gracefully towards pathway
      churchGroup.add(signMesh);

      const postMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3), postMat);
      postL.position.set(11, 1.5, 31);
      churchGroup.add(postL);
      const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3), postMat);
      postR.position.set(21, 1.5, 33);
      churchGroup.add(postR);

      // Cypress Trees around Church Adro
      const treeTrunkMat = new THREE.MeshLambertMaterial({ color: 0x8b7956 });
      const foliageMat = new THREE.MeshLambertMaterial({ color: 0x62885a });
      for (const [tx, tz] of [[-28, 14], [28, 14], [-28, -14], [28, -14]]) {
        const tg = new THREE.Group();
        tg.position.set(tx, 0, tz);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 4), treeTrunkMat);
        trunk.position.y = 2;
        tg.add(trunk);
        const foliage = new THREE.Mesh(new THREE.ConeGeometry(4.8, 14, 6), foliageMat);
        foliage.position.y = 10;
        foliage.castShadow = true;
        tg.add(foliage);
        churchGroup.add(tg);
      }

      scene.add(churchGroup);
    });

    // 7. CENTRAL TOWN PLAZA & FOUNTAIN (Exact colors from 2D PlazaArt: #becb9c grass, #ece1be stone, #d0b98a basin, #70aaa8 water, #c5dfe1 jet, #97774f benches)
    if (layout.plaza) {
      const plazaGroup = new THREE.Group();
      plazaGroup.position.set(layout.plaza.x, 0, layout.plaza.y);

      // Park Grass Bed (#becb9c)
      const parkGrass = new THREE.Mesh(new THREE.BoxGeometry(110, 0.3, 76), new THREE.MeshLambertMaterial({ color: 0xbecb9c }));
      parkGrass.position.y = 0.15;
      parkGrass.receiveShadow = true;
      plazaGroup.add(parkGrass);

      // Sandstone Promenade (#ece1be)
      const promenade = new THREE.Mesh(new THREE.CylinderGeometry(42, 44, 0.4, 32), new THREE.MeshLambertMaterial({ color: 0xece1be }));
      promenade.position.y = 0.35;
      promenade.receiveShadow = true;
      plazaGroup.add(promenade);

      // Outer Stone Basin (#d0b98a)
      const marbleMat = new THREE.MeshLambertMaterial({ color: 0xd0b98a });
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(15, 16, 2.4, 24), marbleMat);
      basin.position.y = 1.4;
      basin.castShadow = true;
      plazaGroup.add(basin);

      // Turquoise Pool of Water (#70aaa8)
      const waterMat = new THREE.MeshLambertMaterial({ color: 0x70aaa8, transparent: true, opacity: 0.85 });
      const water = new THREE.Mesh(new THREE.CylinderGeometry(13.8, 13.8, 0.3, 24), waterMat);
      water.position.y = 2.45;
      plazaGroup.add(water);

      // Central Fountain Pedestal
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 5.5, 16), marbleMat);
      pedestal.position.y = 4.2;
      pedestal.castShadow = true;
      plazaGroup.add(pedestal);

      // Upper Cascade Basin
      const upperBasin = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 7.5, 1.6, 20), marbleMat);
      upperBasin.position.y = 7.0;
      upperBasin.castShadow = true;
      plazaGroup.add(upperBasin);

      const upperWater = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.25, 20), waterMat);
      upperWater.position.y = 7.7;
      plazaGroup.add(upperWater);

      // Rising Fountain Jet (#c5dfe1)
      const jetMat = new THREE.MeshBasicMaterial({ color: 0xc5dfe1, transparent: true, opacity: 0.8 });
      const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.2, 7, 8), jetMat);
      jet.position.y = 11.2;
      plazaGroup.add(jet);

      // Park Benches (#97774f wood and dark iron legs)
      const benchWoodMat = new THREE.MeshLambertMaterial({ color: 0x97774f });
      const benchIronMat = new THREE.MeshLambertMaterial({ color: 0x27272a });
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
        const bx = Math.sin(angle) * 28;
        const bz = Math.cos(angle) * 28;
        const benchGroup = new THREE.Group();
        benchGroup.position.set(bx, 0.4, bz);
        benchGroup.rotation.y = angle + Math.PI;

        const seat = new THREE.Mesh(new THREE.BoxGeometry(7, 0.35, 2.2), benchWoodMat);
        seat.position.y = 1.3;
        benchGroup.add(seat);

        const back = new THREE.Mesh(new THREE.BoxGeometry(7, 1.6, 0.3), benchWoodMat);
        back.position.set(0, 2.2, -1.0);
        benchGroup.add(back);

        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.3, 2.2), benchIronMat);
        legL.position.set(-3.2, 0.65, 0);
        benchGroup.add(legL);
        const legR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.3, 2.2), benchIronMat);
        legR.position.set(3.2, 0.65, 0);
        benchGroup.add(legR);

        plazaGroup.add(benchGroup);
      }

      // Plaza marker on the side
      const plazaSign = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 3),
        new THREE.MeshBasicMaterial({ map: createParishSignTexture(`Praça de ${city.name}`), transparent: true })
      );
      plazaSign.position.set(22, 2.5, 34);
      plazaSign.rotation.y = -0.3;
      plazaGroup.add(plazaSign);

      scene.add(plazaGroup);
    }

    // 8. HOUSES & CREATOR'S CASTLE (Faithfully matching 2D CreatorCastleArt and HouseArt)
    for (const plot of layout.plots) {
      const hGroup = new THREE.Group();
      hGroup.position.set(plot.x, 0, plot.y);

      const isCreatorPlot =
        plot.house.role === 'criador' ||
        plot.house.username.toLowerCase().replace(/^@/, '') === 'lucasgfr26' ||
        isCreatorIsland;

      if (isCreatorPlot) {
        // === CASTELO DO CRIADOR (Exact match of CreatorCastleArt in town-art.tsx) ===
        // Pátio nobre de pedra com borda dourada (#dfcea7, #b88f40)
        const patio = new THREE.Mesh(new THREE.CylinderGeometry(28, 30, 0.8, 32), new THREE.MeshLambertMaterial({ color: 0xdfcea7 }));
        patio.position.y = 0.4;
        patio.receiveShadow = true;
        hGroup.add(patio);

        // Parede principal do Castelo em pedra mármore nobre (#fdfbf7 e #e8ded1)
        const castleWallMat = new THREE.MeshLambertMaterial({ color: 0xfdfbf7 });
        const keep = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), castleWallMat);
        keep.position.y = 10;
        keep.castShadow = true;
        hGroup.add(keep);

        // Torres Laterais Esquerda e Direita (#ece4d8) com telhado cônico de ouro puro (#ffd700) e cruzes (#b8860b)
        const towerWallMat = new THREE.MeshLambertMaterial({ color: 0xece4d8 });
        const goldRoofMat = new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0xb8860b, emissiveIntensity: 0.25 });
        const goldCrossMat = new THREE.MeshLambertMaterial({ color: 0xb8860b });

        for (const [tx, tz] of [[-13, 9], [13, 9]]) {
          const tower = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5, 24, 16), towerWallMat);
          tower.position.set(tx, 12, tz);
          tower.castShadow = true;
          hGroup.add(tower);

          const spire = new THREE.Mesh(new THREE.ConeGeometry(5.2, 14, 16), goldRoofMat);
          spire.position.set(tx, 31, tz);
          hGroup.add(spire);

          const crH = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 0.5), goldCrossMat);
          const crV = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.5, 0.5), goldCrossMat);
          crH.position.set(tx, 39, tz);
          crV.position.set(tx, 38.5, tz);
          hGroup.add(crH);
          hGroup.add(crV);
        }

        // Torre Central / Cúpula Maior com telhado piramidal de ouro (#ffd700)
        const centralSpire = new THREE.Mesh(new THREE.ConeGeometry(8, 14, 4), goldRoofMat);
        centralSpire.position.set(0, 27, 0);
        centralSpire.rotation.y = Math.PI / 4;
        hGroup.add(centralSpire);

        // Portal em arco gótico em madeira nobre (#2d1804 / #5c3818)
        const portal = new THREE.Mesh(new THREE.BoxGeometry(6, 9, 1.2), new THREE.MeshLambertMaterial({ color: 0x2d1804 }));
        portal.position.set(0, 4.5, 10.4);
        hGroup.add(portal);

        // Vitrais góticos reluzentes em amarelo dourado (#fef08a)
        const vitralMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        const vitral1 = new THREE.Mesh(new THREE.BoxGeometry(3, 5, 0.2), vitralMat);
        vitral1.position.set(0, 14, 10.2);
        hGroup.add(vitral1);

        // Grande Coroa Real do Criador com pedras preciosas (#ffd700, rubi #ef4444 e safiras #3b82f6)
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 4.8, 3.5, 8), goldRoofMat);
        crown.position.set(0, 35, 0);
        hGroup.add(crown);

        const ruby = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        ruby.position.set(0, 37.5, 0);
        hGroup.add(ruby);
      } else {
        // === CASA COLONIAL DO FIEL (Exact match of HouseArt in town-art.tsx) ===
        // Base de jardim verde (#8eae78)
        const garden = new THREE.Mesh(new THREE.CylinderGeometry(12, 13, 0.3, 16), new THREE.MeshLambertMaterial({ color: 0x8eae78 }));
        garden.position.y = 0.15;
        hGroup.add(garden);

        // Parede frontal na cor do morador e lateral em bege colonial (#e3cf9e)
        const citizenColor = parseInt((plot.house.color ?? '#0284c7').replace('#', '0x'), 16);
        const houseBody = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshLambertMaterial({ color: citizenColor }));
        houseBody.position.y = 4.15;
        houseBody.castShadow = true;
        hGroup.add(houseBody);

        // Telhado cerâmico colonial (#ad7054, #6e8392, #bb975e, #806d83)
        const roofSeed = plot.house.id % 4;
        const roofColor = [0xad7054, 0x6e8392, 0xbb975e, 0x806d83][roofSeed];
        const hRoof = new THREE.Mesh(new THREE.ConeGeometry(10, 5.5, 4), new THREE.MeshLambertMaterial({ color: roofColor }));
        hRoof.position.y = 10.5;
        hRoof.rotation.y = Math.PI / 4;
        hGroup.add(hRoof);

        // Porta colonial e janela iluminada (#fff1b4)
        const hDoor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.2, 0.3), new THREE.MeshLambertMaterial({ color: 0x6e6653 }));
        hDoor.position.set(-2, 2.2, 6.1);
        hGroup.add(hDoor);

        const hWin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 0.2), new THREE.MeshBasicMaterial({ color: 0xfff1b4 }));
        hWin.position.set(2.5, 3.5, 6.1);
        hGroup.add(hWin);
      }

      scene.add(hGroup);
    }

    // 9. TREES (Matching TreeArt: #8b7956 trunk, #62885a / #799c68 / #8f9b64 leafy foliage)
    const treeTrunkMat = new THREE.MeshLambertMaterial({ color: 0x8b7956 });
    const foliageColors = [0x62885a, 0x799c68, 0x8f9b64];

    for (const tree of layout.trees) {
      const tg = new THREE.Group();
      tg.position.set(tree.x, 0, tree.y);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 4.5), treeTrunkMat);
      trunk.position.y = 2.25;
      tg.add(trunk);

      const folMat = new THREE.MeshLambertMaterial({ color: foliageColors[tree.variant % 3] });
      const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(5.2, 1), folMat);
      foliage.position.y = 8.5;
      foliage.castShadow = true;
      tg.add(foliage);

      scene.add(tg);
    }

    // 10. STREET LAMPS
    const postMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const lampLightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const lampSpacing = 50;
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 12, 6), postMat);
      post.position.set(i * lampSpacing, 6, 26);
      scene.add(post);

      const lantern = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), lampLightMat);
      lantern.position.set(i * lampSpacing, 12, 26);
      scene.add(lantern);

      const pLight = new THREE.PointLight(0xfef08a, 1.2, 45);
      pLight.position.set(i * lampSpacing, 11, 26);
      scene.add(pLight);
    }

    // 11. 3D CHARACTER (VOXEL MODEL WITH COMPLETE FACIAL FEATURES)
    const playerGroup = new THREE.Group();
    const currentConfig = characterRef.current;
    let clothing = getRoleClothing(currentConfig.role, currentConfig.gender);

    const skinColor = 0xd4a373;
    const skinMat = new THREE.MeshLambertMaterial({ color: skinColor });
    const hairColor = currentConfig.gender === 'female' ? 0x451a03 : 0x292524;
    const hairMat = new THREE.MeshLambertMaterial({ color: hairColor });
    const torsoMat = new THREE.MeshLambertMaterial({ color: clothing.torso });
    const legsMat = new THREE.MeshLambertMaterial({ color: clothing.legs });

    // Torso
    const torsoGeo = new THREE.BoxGeometry(3.6, 5.0, 2.2);
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 5.2;
    torso.castShadow = true;
    playerGroup.add(torso);

    // Collar (apenas para clérigo/padre com clérgima branca)
    const colMat = new THREE.MeshBasicMaterial({ color: clothing.collar ?? 0xffffff });
    const col = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.3), colMat);
    col.position.set(0, 7.5, 0);
    col.visible = Boolean(clothing.collar);
    playerGroup.add(col);

    // Sash
    const sashMat = new THREE.MeshBasicMaterial({ color: clothing.sash ?? 0xf59e0b });
    const sash = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.2, 2.4), sashMat);
    sash.position.set(0, 5.2, 0);
    sash.rotation.z = Math.PI / 4;
    sash.visible = Boolean(clothing.sash);
    playerGroup.add(sash);

    // Head Group - encapsulates skull, face, eyes, hair, crown as a single unified rig
    const head = new THREE.Group();
    head.position.y = 9.3;
    playerGroup.add(head);

    const skullMesh = new THREE.Mesh(new THREE.BoxGeometry(3.1, 3.1, 3.1), skinMat);
    skullMesh.castShadow = true;
    head.add(skullMesh);

    // --- FACIAL FEATURES (all parented to head with local coordinates relative to center) ---
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x831843 });
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf87171 });
    const eyebrowMat = new THREE.MeshBasicMaterial({ color: hairColor });

    for (const side of [-1, 1]) {
      const ex = side * 0.78;
      // In local coordinates: head center is at (0, 0, 0). Front face is at z = 1.55.
      const eyeWhite = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.08), eyeWhiteMat);
      eyeWhite.position.set(ex, 0.1, 1.59);
      head.add(eyeWhite);

      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.1), eyePupilMat);
      pupil.position.set(ex + side * 0.04, 0.08, 1.61);
      head.add(pupil);

      const gleam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.12), eyeHighlightMat);
      gleam.position.set(ex + 0.1, 0.22, 1.63);
      head.add(gleam);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.08), eyebrowMat);
      brow.position.set(ex, 0.6, 1.6);
      head.add(brow);

      const blush = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.06), blushMat);
      blush.position.set(side * 1.12, -0.6, 1.58);
      head.add(blush);
    }

    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.25), new THREE.MeshLambertMaterial({ color: 0xc48b59 }));
    nose.position.set(0, -0.25, 1.68);
    head.add(nose);

    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 0.08), mouthMat);
    mouth.position.set(0, -0.88, 1.59);
    head.add(mouth);

    // Hair Container (child of head)
    const hairGroup = new THREE.Group();
    head.add(hairGroup);

    const rebuildHair = (g: CharacterGender) => {
      while (hairGroup.children.length > 0) {
        hairGroup.remove(hairGroup.children[0]);
      }
      if (g === 'female') {
        const hairBack = new THREE.Mesh(new THREE.BoxGeometry(3.3, 4.4, 1.8), hairMat);
        hairBack.position.set(0, 0, -0.9);
        hairGroup.add(hairBack);

        const hairTop = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.8, 3.3), hairMat);
        hairTop.position.set(0, 1.7, 0);
        hairGroup.add(hairTop);

        for (const side of [-1, 1]) {
          const lock = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.0, 0.8), hairMat);
          lock.position.set(side * 1.62, -0.5, 0.8);
          hairGroup.add(lock);
        }
      } else {
        const hairTop = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.0, 3.3), hairMat);
        hairTop.position.set(0, 1.7, 0);
        hairGroup.add(hairTop);

        const hairBack = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 1.0), hairMat);
        hairBack.position.set(0, 0.5, -1.2);
        hairGroup.add(hairBack);

        for (const side of [-1, 1]) {
          const sideburn = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 1.2), hairMat);
          sideburn.position.set(side * 1.56, 0.3, 0.2);
          hairGroup.add(sideburn);
        }
      }
    };
    rebuildHair(currentConfig.gender);

    // Coroa do Criador (child of head)
    const crownGroup = new THREE.Group();
    const crownGeo = new THREE.CylinderGeometry(1.8, 1.5, 1.1, 8);
    const crownMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b, emissive: 0xb45309, emissiveIntensity: 0.5 });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.set(0, 2.5, 0);
    crownGroup.add(crown);

    const rubyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    rubyMesh.position.set(0, 2.7, 1.6);
    crownGroup.add(rubyMesh);
    crownGroup.visible = currentConfig.role === 'criador';
    head.add(crownGroup);

    // Prepare Lace Materials for Surplices
    const coroinhaLaceTex = createLaceTexture('coroinha');
    const cerimoniarioLaceTex = createLaceTexture('cerimoniario');

    const coroinhaLaceMat = new THREE.MeshBasicMaterial({
      map: coroinhaLaceTex,
      transparent: true,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
    });

    const cerimoniarioLaceMat = new THREE.MeshBasicMaterial({
      map: cerimoniarioLaceTex,
      transparent: true,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
    });

    // Arms & Hands (Pivoted cleanly at the shoulder Y = 7.3, X = ±2.38 for zero head clipping)
    const armGeo = new THREE.BoxGeometry(1.15, 3.6, 1.15);
    const handGeo = new THREE.BoxGeometry(0.95, 0.95, 0.95);

    const armL = new THREE.Group();
    armL.position.set(-2.38, 7.3, 0);
    playerGroup.add(armL);

    const armMeshL = new THREE.Mesh(armGeo, torsoMat);
    armMeshL.position.set(0, -1.8, 0);
    armL.add(armMeshL);

    const handL = new THREE.Mesh(handGeo, skinMat);
    handL.position.set(0, -3.7, 0);
    armL.add(handL);

    const armR = new THREE.Group();
    armR.position.set(2.38, 7.3, 0);
    playerGroup.add(armR);

    const armMeshR = new THREE.Mesh(armGeo, torsoMat);
    armMeshR.position.set(0, -1.8, 0);
    armR.add(armMeshR);

    const handR = new THREE.Mesh(handGeo, skinMat);
    handR.position.set(0, -3.7, 0);
    armR.add(handR);

    // Surplice wide bell sleeves on armL & armR (São Pedro Paramentaria style)
    const surpliceSleeveMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: 0x242424,
    });
    const surpliceSleeveGeo = new THREE.BoxGeometry(1.48, 2.2, 1.48);
    const surpliceSleeveL = new THREE.Mesh(surpliceSleeveGeo, surpliceSleeveMat);
    surpliceSleeveL.position.set(0, -1.1, 0);
    armL.add(surpliceSleeveL);

    const sleeveLaceGeo = new THREE.BoxGeometry(1.52, 1.1, 1.52);
    const sleeveLaceL = new THREE.Mesh(sleeveLaceGeo, coroinhaLaceMat);
    sleeveLaceL.position.set(0, -2.4, 0);
    armL.add(sleeveLaceL);

    const sleeveHemGeo = new THREE.BoxGeometry(1.5, 0.28, 1.5);
    const sleeveHemL = new THREE.Mesh(sleeveHemGeo, surpliceSleeveMat);
    sleeveHemL.position.set(0, -3.05, 0);
    armL.add(sleeveHemL);

    const surpliceSleeveR = new THREE.Mesh(surpliceSleeveGeo, surpliceSleeveMat);
    surpliceSleeveR.position.set(0, -1.1, 0);
    armR.add(surpliceSleeveR);

    const sleeveLaceR = new THREE.Mesh(sleeveLaceGeo, coroinhaLaceMat);
    sleeveLaceR.position.set(0, -2.4, 0);
    armR.add(sleeveLaceR);

    const sleeveHemR = new THREE.Mesh(sleeveHemGeo, surpliceSleeveMat);
    sleeveHemR.position.set(0, -3.05, 0);
    armR.add(sleeveHemR);

    const initIsSurplice = currentConfig.role === 'coroinha' || currentConfig.role === 'cerimoniario';
    surpliceSleeveL.visible = initIsSurplice;
    surpliceSleeveR.visible = initIsSurplice;
    sleeveLaceL.visible = initIsSurplice;
    sleeveLaceR.visible = initIsSurplice;
    sleeveHemL.visible = initIsSurplice;
    sleeveHemR.visible = initIsSurplice;
    if (initIsSurplice) {
      const mat = currentConfig.role === 'cerimoniario' ? cerimoniarioLaceMat : coroinhaLaceMat;
      sleeveLaceL.material = mat;
      sleeveLaceR.material = mat;
    }

    // Legs & Shoes - Two-segment anatomy (Thigh + Shin/Knee) for true upright kneeling
    const thighGeo = new THREE.BoxGeometry(1.36, 2.3, 1.36);
    const shinGeo = new THREE.BoxGeometry(1.32, 2.3, 1.32);
    const shoeGeo = new THREE.BoxGeometry(1.45, 0.8, 2.0);
    const shoeMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });

    // Left Leg: Hip at Y = 4.6
    const legL = new THREE.Group();
    legL.position.set(-1.0, 4.6, 0);
    playerGroup.add(legL);

    const thighMeshL = new THREE.Mesh(thighGeo, legsMat);
    thighMeshL.position.set(0, -1.15, 0);
    legL.add(thighMeshL);

    // Left Knee pivot at Y = -2.3
    const kneeL = new THREE.Group();
    kneeL.position.set(0, -2.3, 0);
    legL.add(kneeL);

    const shinMeshL = new THREE.Mesh(shinGeo, legsMat);
    shinMeshL.position.set(0, -1.15, 0);
    kneeL.add(shinMeshL);

    const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
    shoeL.position.set(0, -2.1, 0.28);
    kneeL.add(shoeL);

    // Right Leg: Hip at Y = 4.6
    const legR = new THREE.Group();
    legR.position.set(1.0, 4.6, 0);
    playerGroup.add(legR);

    const thighMeshR = new THREE.Mesh(thighGeo, legsMat);
    thighMeshR.position.set(0, -1.15, 0);
    legR.add(thighMeshR);

    // Right Knee pivot at Y = -2.3
    const kneeR = new THREE.Group();
    kneeR.position.set(0, -2.3, 0);
    legR.add(kneeR);

    const shinMeshR = new THREE.Mesh(shinGeo, legsMat);
    shinMeshR.position.set(0, -1.15, 0);
    kneeR.add(shinMeshR);

    const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
    shoeR.position.set(0, -2.1, 0.28);
    kneeR.add(shoeR);

    // ==========================================
    // ROLE SPECIFIC VESTMENTS & ACCESORIES
    // ==========================================

    // 1. PADRE: Batina preta que vai até os pés com botões e estola branca
    const padreGroup = new THREE.Group();
    const padreSkirtMat = new THREE.MeshLambertMaterial({ color: 0x111113 });
    const padreSkirt = new THREE.Mesh(new THREE.BoxGeometry(3.68, 4.4, 2.26), padreSkirtMat);
    padreSkirt.position.set(0, 2.5, 0);
    padreGroup.add(padreSkirt);

    const buttonMat = new THREE.MeshBasicMaterial({ color: 0x3f3f46 });
    const buttonGeo = new THREE.BoxGeometry(0.18, 0.18, 0.08);
    for (let y = 7.1; y >= 0.8; y -= 0.65) {
      const btn = new THREE.Mesh(buttonGeo, buttonMat);
      btn.position.set(0, y, y >= 5.0 ? 1.15 : 1.17);
      padreGroup.add(btn);
    }

    const stolaMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const goldCrossMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    for (const side of [-1, 1]) {
      const stolaBand = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.8, 0.08), stolaMat);
      stolaBand.position.set(side * 0.75, 5.3, 1.16);
      padreGroup.add(stolaBand);

      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.04), goldCrossMat);
      crossV.position.set(side * 0.75, 3.85, 1.21);
      padreGroup.add(crossV);

      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.04), goldCrossMat);
      crossH.position.set(side * 0.75, 3.92, 1.21);
      padreGroup.add(crossH);
    }
    padreGroup.visible = currentConfig.role === 'padre';
    playerGroup.add(padreGroup);

    // 2. COROINHA: Túnica vermelha e sobrepeliz rendada branca sobreposta com bicos de renda
    const coroinhaGroup = new THREE.Group();
    const redSkirtMat = new THREE.MeshLambertMaterial({ color: 0x881337 });
    const redSkirt = new THREE.Mesh(new THREE.BoxGeometry(3.68, 4.4, 2.26), redSkirtMat);
    redSkirt.position.set(0, 2.5, 0);
    coroinhaGroup.add(redSkirt);

    const sobrepelizMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x1f1f1f });
    const coroinhaTorso = new THREE.Mesh(new THREE.BoxGeometry(3.82, 3.8, 2.38), sobrepelizMat);
    coroinhaTorso.position.set(0, 5.8, 0);
    coroinhaGroup.add(coroinhaTorso);

    // Vertical pleats on surplice front
    const pleatGeo = new THREE.BoxGeometry(0.18, 3.5, 0.08);
    for (const px of [-1.2, -0.4, 0.4, 1.2]) {
      const pleatF = new THREE.Mesh(pleatGeo, sobrepelizMat);
      pleatF.position.set(px, 5.8, 1.22);
      coroinhaGroup.add(pleatF);
    }

    const squareColMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const squareCol = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.32, 2.22), squareColMat);
    squareCol.position.set(0, 7.55, 0);
    coroinhaGroup.add(squareCol);

    // Upper white linen skirt of surplice
    const coroinhaSurpliceUpper = new THREE.Mesh(new THREE.BoxGeometry(3.88, 1.2, 2.44), sobrepelizMat);
    coroinhaSurpliceUpper.position.set(0, 3.6, 0);
    coroinhaGroup.add(coroinhaSurpliceUpper);

    // Lower transparent church lace border showing the red cassock beneath
    const coroinhaLaceSkirt = new THREE.Mesh(new THREE.BoxGeometry(3.92, 1.6, 2.48), coroinhaLaceMat);
    coroinhaLaceSkirt.position.set(0, 2.35, 0);
    coroinhaGroup.add(coroinhaLaceSkirt);

    coroinhaGroup.visible = currentConfig.role === 'coroinha';
    playerGroup.add(coroinhaGroup);

    // 3. ACÓLITO: Túnica branca pura e cíngulo cinza na cintura
    const acolitoGroup = new THREE.Group();
    const acolitoSkirtMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const acolitoSkirt = new THREE.Mesh(new THREE.BoxGeometry(3.68, 4.4, 2.26), acolitoSkirtMat);
    acolitoSkirt.position.set(0, 2.5, 0);
    acolitoGroup.add(acolitoSkirt);

    const cinguloMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const cinguloBand = new THREE.Mesh(new THREE.BoxGeometry(3.78, 0.38, 2.38), cinguloMat);
    cinguloBand.position.set(0, 4.8, 0);
    acolitoGroup.add(cinguloBand);

    const cinguloKnot = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.35), cinguloMat);
    cinguloKnot.position.set(-1.4, 4.8, 1.15);
    acolitoGroup.add(cinguloKnot);

    const cinguloTassel = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.2, 0.2), cinguloMat);
    cinguloTassel.position.set(-1.4, 3.6, 1.15);
    acolitoGroup.add(cinguloTassel);

    acolitoGroup.visible = currentConfig.role === 'acolito';
    playerGroup.add(acolitoGroup);

    // 4. CERIMONIÁRIO: Túnica preta e sobrepeliz branca de alta paramentaria (estilo São Pedro Paramentaria)
    const cerimoniarioGroup = new THREE.Group();
    const blackSkirtMat = new THREE.MeshLambertMaterial({ color: 0x18181b });
    const blackSkirt = new THREE.Mesh(new THREE.BoxGeometry(3.68, 4.4, 2.26), blackSkirtMat);
    blackSkirt.position.set(0, 2.5, 0);
    cerimoniarioGroup.add(blackSkirt);

    const cerSobrepelizMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: 0x242424,
    });
    const cerSobrepelizTorso = new THREE.Mesh(new THREE.BoxGeometry(3.84, 3.8, 2.38), cerSobrepelizMat);
    cerSobrepelizTorso.position.set(0, 5.8, 0);
    cerimoniarioGroup.add(cerSobrepelizTorso);

    // Classical vertical box pleats on torso (front & back)
    const cerPleatGeo = new THREE.BoxGeometry(0.22, 3.7, 0.06);
    for (const px of [-1.3, -0.78, -0.26, 0.26, 0.78, 1.3]) {
      const pleatF = new THREE.Mesh(cerPleatGeo, cerSobrepelizMat);
      pleatF.position.set(px, 5.8, 1.22);
      cerimoniarioGroup.add(pleatF);

      const pleatB = new THREE.Mesh(cerPleatGeo, cerSobrepelizMat);
      pleatB.position.set(px, 5.8, -1.22);
      cerimoniarioGroup.add(pleatB);
    }

    // Square Roman collar in pure white
    const cerSquareCol = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.32, 2.22), squareColMat);
    cerSquareCol.position.set(0, 7.55, 0);
    cerimoniarioGroup.add(cerSquareCol);

    // Surplice upper linen skirt
    const cerSurpliceUpper = new THREE.Mesh(new THREE.BoxGeometry(3.88, 1.2, 2.44), cerSobrepelizMat);
    cerSurpliceUpper.position.set(0, 3.6, 0);
    cerimoniarioGroup.add(cerSurpliceUpper);

    // Cerimoniário wide lace border with crowned golden monograms
    const cerLaceSkirt = new THREE.Mesh(new THREE.BoxGeometry(3.92, 1.5, 2.48), cerimoniarioLaceMat);
    cerLaceSkirt.position.set(0, 2.35, 0);
    cerimoniarioGroup.add(cerLaceSkirt);

    // Folded white linen hem at bottom
    const cerHemSkirt = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.28, 2.46), cerSobrepelizMat);
    cerHemSkirt.position.set(0, 1.5, 0);
    cerimoniarioGroup.add(cerHemSkirt);

    cerimoniarioGroup.visible = currentConfig.role === 'cerimoniario';
    playerGroup.add(cerimoniarioGroup);

    // 5. MINISTRO: Jaleco branco com botões pretos e logo de eucaristia no peito esquerdo
    const ministroGroup = new THREE.Group();
    const jalecoMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const jaleco = new THREE.Mesh(new THREE.BoxGeometry(3.72, 5.08, 2.28), jalecoMat);
    jaleco.position.set(0, 5.2, 0);
    ministroGroup.add(jaleco);

    const minBtnMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const minBtnGeo = new THREE.BoxGeometry(0.18, 0.18, 0.08);
    for (const by of [6.8, 6.2, 5.6, 5.0, 4.4]) {
      const btn = new THREE.Mesh(minBtnGeo, minBtnMat);
      btn.position.set(0, by, 1.18);
      ministroGroup.add(btn);
    }

    const logoGroup = new THREE.Group();
    logoGroup.position.set(-0.9, 6.1, 1.18);

    const chaliceMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
    const chaliceCup = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.08), chaliceMat);
    logoGroup.add(chaliceCup);
    const chaliceStem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.08), chaliceMat);
    chaliceStem.position.set(0, -0.3, 0);
    logoGroup.add(chaliceStem);
    const chaliceBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.08), chaliceMat);
    chaliceBase.position.set(0, -0.48, 0);
    logoGroup.add(chaliceBase);

    const hostMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const host = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.1), hostMat);
    host.position.set(0, 0.38, 0.02);
    logoGroup.add(host);

    const hostCrossMat = new THREE.MeshBasicMaterial({ color: 0xd4af37 });
    const hcV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.04), hostCrossMat);
    hcV.position.set(0, 0.38, 0.08);
    logoGroup.add(hcV);
    const hcH = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.04), hostCrossMat);
    hcH.position.set(0, 0.42, 0.08);
    logoGroup.add(hcH);

    ministroGroup.add(logoGroup);
    ministroGroup.visible = currentConfig.role === 'ministro';
    playerGroup.add(ministroGroup);

    // 6. SACRISTÃO: Roupa sóbria com molho de chaves litúrgicas douradas no cinto
    const sacristaoGroup = new THREE.Group();
    const beltMat = new THREE.MeshLambertMaterial({ color: 0x18181b });
    const belt = new THREE.Mesh(new THREE.BoxGeometry(3.72, 0.38, 2.3), beltMat);
    belt.position.set(0, 4.8, 0);
    sacristaoGroup.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.08), new THREE.MeshBasicMaterial({ color: 0x94a3b8 }));
    buckle.position.set(0, 4.8, 1.18);
    sacristaoGroup.add(buckle);

    const keyRingGroup = new THREE.Group();
    keyRingGroup.position.set(1.65, 4.6, 0.3);

    const ringMat = new THREE.MeshBasicMaterial({ color: 0xd4af37 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 16), ringMat);
    ring.rotation.y = Math.PI / 2;
    keyRingGroup.add(ring);

    for (let i = 0; i < 3; i++) {
      const keyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.05), ringMat);
      keyMesh.position.set(0, -0.45, (i - 1) * 0.1);
      keyMesh.rotation.z = (i - 1) * 0.15;
      keyRingGroup.add(keyMesh);

      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.06), ringMat);
      tooth.position.set(0.06, -0.72, (i - 1) * 0.1);
      keyRingGroup.add(tooth);
    }
    sacristaoGroup.add(keyRingGroup);
    sacristaoGroup.visible = currentConfig.role === 'sacristao';
    playerGroup.add(sacristaoGroup);

    // 7. PREFEITO / GOVERNADOR / PRESIDENTE: Terno executivo e gravata sob a faixa (sem clérgima)
    const civicGroup = new THREE.Group();
    const tieMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.5, 0.08), tieMat);
    tie.position.set(0, 6.2, 1.15);
    civicGroup.add(tie);
    civicGroup.visible = ['prefeito', 'governador', 'presidente'].includes(currentConfig.role);
    playerGroup.add(civicGroup);

    // 8. LEIGO: Roupa social normal com cinto de couro elegante (sem clérgima)
    const leigoGroup = new THREE.Group();
    const leigoBeltMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
    const leigoBelt = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.35, 2.28), leigoBeltMat);
    leigoBelt.position.set(0, 4.8, 0);
    leigoGroup.add(leigoBelt);

    const leigoBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.08), new THREE.MeshBasicMaterial({ color: 0x94a3b8 }));
    leigoBuckle.position.set(0, 4.8, 1.16);
    leigoGroup.add(leigoBuckle);

    const leigoColMat = new THREE.MeshLambertMaterial({ color: clothing.torso });
    const leigoCol = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 2.25), leigoColMat);
    leigoCol.position.set(0, 7.55, 0);
    leigoGroup.add(leigoCol);
    leigoGroup.visible = currentConfig.role === 'leigo';
    playerGroup.add(leigoGroup);

    // Function to dynamically update appearance in place without restarting scene
    updateAppearanceRef.current = (newConfig: WalkCharacterConfig) => {
      const newClothing = getRoleClothing(newConfig.role, newConfig.gender);
      torsoMat.color.setHex(newClothing.torso);
      legsMat.color.setHex(newClothing.legs);
      if (newClothing.collar) {
        col.visible = true;
        colMat.color.setHex(newClothing.collar);
      } else {
        col.visible = false;
      }
      if (newClothing.sash) {
        sash.visible = true;
        sashMat.color.setHex(newClothing.sash);
      } else {
        sash.visible = false;
      }
      crownGroup.visible = newConfig.role === 'criador';
      padreGroup.visible = newConfig.role === 'padre';
      coroinhaGroup.visible = newConfig.role === 'coroinha';
      acolitoGroup.visible = newConfig.role === 'acolito';
      cerimoniarioGroup.visible = newConfig.role === 'cerimoniario';
      ministroGroup.visible = newConfig.role === 'ministro';
      sacristaoGroup.visible = newConfig.role === 'sacristao';
      civicGroup.visible = ['prefeito', 'governador', 'presidente'].includes(newConfig.role);
      leigoGroup.visible = newConfig.role === 'leigo';
      leigoColMat.color.setHex(newClothing.torso);
      armMeshL.material = torsoMat;
      armMeshR.material = torsoMat;
      thighMeshL.material = legsMat;
      shinMeshL.material = legsMat;
      thighMeshR.material = legsMat;
      shinMeshR.material = legsMat;
      const isSurplice = newConfig.role === 'coroinha' || newConfig.role === 'cerimoniario';
      surpliceSleeveL.visible = isSurplice;
      surpliceSleeveR.visible = isSurplice;
      sleeveLaceL.visible = isSurplice;
      sleeveLaceR.visible = isSurplice;
      sleeveHemL.visible = isSurplice;
      sleeveHemR.visible = isSurplice;
      if (isSurplice) {
        const mat = newConfig.role === 'cerimoniario' ? cerimoniarioLaceMat : coroinhaLaceMat;
        sleeveLaceL.material = mat;
        sleeveLaceR.material = mat;
      }
      rebuildHair(newConfig.gender);
    };

    // Initial Spawn Location: In the open plaza in front of the target church (z = targetDistrict.y + 44)
    const targetDistrict =
      (targetParishId ? layout.districts.find((d: any) => d.parish.id === targetParishId) : null) ?? layout.districts[0];
    const spawnX = targetDistrict ? targetDistrict.x : 0;
    const spawnZ = targetDistrict ? targetDistrict.y + 44 : 44;

    playerGroup.position.set(spawnX, 0, spawnZ);
    // Face the church (-Z) initially
    let playerAngle = Math.PI;
    playerGroup.rotation.y = playerAngle;
    scene.add(playerGroup);

    // 12. Controls & Movement State
    const keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      arrowLeft: false,
      arrowRight: false,
      arrowUp: false,
      arrowDown: false,
      run: false,
    };
    let cameraAngle = 0;
    let cameraPitch = 0.32;
    let walkTime = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys if typing inside input / textarea (like chat)
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const k = e.key.toLowerCase();
      if (k === 'w') keys.forward = true;
      if (k === 's') keys.backward = true;
      if (k === 'a') keys.left = true;
      if (k === 'd') keys.right = true;
      if (e.key === 'ArrowUp') keys.arrowUp = true;
      if (e.key === 'ArrowDown') keys.arrowDown = true;
      if (e.key === 'ArrowLeft') keys.arrowLeft = true;
      if (e.key === 'ArrowRight') keys.arrowRight = true;
      if (e.key === 'Shift') keys.run = true;
      if (e.key === 'Escape') onExitRef.current();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w') keys.forward = false;
      if (k === 's') keys.backward = false;
      if (k === 'a') keys.left = false;
      if (k === 'd') keys.right = false;
      if (e.key === 'ArrowUp') keys.arrowUp = false;
      if (e.key === 'ArrowDown') keys.arrowDown = false;
      if (e.key === 'ArrowLeft') keys.arrowLeft = false;
      if (e.key === 'ArrowRight') keys.arrowRight = false;
      if (e.key === 'Shift') keys.run = false;
    };

    // Mouse drag to rotate camera
    let isMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        // Only track if clicked directly on canvas (not on HUD buttons or chat)
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'CANVAS' || target === container)) {
          isMouseDown = true;
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        }
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      cameraAngle -= dx * 0.006;
      cameraPitch = Math.max(0.1, Math.min(1.2, cameraPitch + dy * 0.005));
    };
    const onMouseUp = () => {
      isMouseDown = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 13. Physics & Animation Step
    const stepPhysics = (dt: number, now: number) => {
      // Arrow keys rotate camera
      if (keys.arrowLeft) cameraAngle += 2.0 * dt;
      if (keys.arrowRight) cameraAngle -= 2.0 * dt;
      if (keys.arrowUp) cameraPitch = Math.max(0.1, cameraPitch - 1.0 * dt);
      if (keys.arrowDown) cameraPitch = Math.min(1.2, cameraPitch + 1.0 * dt);

      // Auto-walk for cinematic video capture
      if (autoWalk) {
        keys.forward = true;
        cameraAngle += 0.22 * dt;
      }

      // Camera horizontal basis vectors on XZ ground plane
      const camForwardX = -Math.sin(cameraAngle);
      const camForwardZ = -Math.cos(cameraAngle);
      const camRightX = Math.cos(cameraAngle);
      const camRightZ = -Math.sin(cameraAngle);

      let moveDirX = 0;
      let moveDirZ = 0;
      if (keys.forward) {
        moveDirX += camForwardX;
        moveDirZ += camForwardZ;
      }
      if (keys.backward) {
        moveDirX -= camForwardX;
        moveDirZ -= camForwardZ;
      }
      if (keys.right) {
        moveDirX += camRightX;
        moveDirZ += camRightZ;
      }
      if (keys.left) {
        moveDirX -= camRightX;
        moveDirZ -= camRightZ;
      }

      const moveLen = Math.hypot(moveDirX, moveDirZ);
      const isMoving = moveLen > 0.001;
      const speed = keys.run ? 28 : 15;

      if (isMoving) {
        moveDirX /= moveLen;
        moveDirZ /= moveLen;

        // Character faces travel direction
        playerAngle = Math.atan2(moveDirX, moveDirZ);

        playerGroup.position.x += moveDirX * speed * dt;
        playerGroup.position.z += moveDirZ * speed * dt;

        walkTime += dt * (keys.run ? 15 : 9);
      }

      // Skirt / cassock gentle sway when walking
      const skirtSway = isMoving ? Math.sin(walkTime * 2) * 0.05 : 0;
      padreSkirt.rotation.z = skirtSway;
      redSkirt.rotation.z = skirtSway;
      acolitoSkirt.rotation.z = skirtSway;
      blackSkirt.rotation.z = skirtSway;

      // Emotes read from ref
      const action = currentActionRef.current;
      if (action === 'pray') {
        // True Catholic Kneeling: Upright posture on knees (NOT sitting on heels!)
        playerGroup.position.y = -2.25;

        // Thighs stay upright / vertical
        legL.rotation.set(-0.06, 0, 0);
        legR.rotation.set(-0.06, 0, 0);

        // Lower legs fold backward 90 degrees along the floor
        kneeL.rotation.set(-1.57, 0, 0);
        kneeR.rotation.set(-1.57, 0, 0);

        // Hands meet reverently in prayer directly in front of the chest
        armL.rotation.set(-0.85, -0.36, 0.36);
        armR.rotation.set(-0.85, 0.36, -0.36);

        // Reverent bow of head & subtle contemplation breath
        const breath = Math.sin(now * 0.003) * 0.03;
        head.rotation.set(0.22 + breath, 0, 0);
        torso.rotation.set(0.04, 0, 0);

        // Cassocks / batinas hang straight down around the upright kneeling legs
        padreSkirt.rotation.x = -0.04;
        redSkirt.rotation.x = -0.04;
        blackSkirt.rotation.x = -0.04;
        acolitoSkirt.rotation.x = -0.04;
      } else if (action === 'cheer') {
        // Joyful jump in place with hands held forward and high in triumphant praise
        const jumpPhase = Math.sin(now * 0.012);
        const jump = Math.max(0, jumpPhase * 2.3);
        playerGroup.position.y = jump;

        kneeL.rotation.set(0, 0, 0);
        kneeR.rotation.set(0, 0, 0);

        if (jump > 0.3) {
          legL.rotation.set(0.35, 0, 0);
          legR.rotation.set(-0.25, 0, 0);
        } else {
          legL.rotation.set(0, 0, 0);
          legR.rotation.set(0, 0, 0);
        }

        // Arms raised FORWARD and UP in a triumphant celebratory V-shape in front of the body
        // Zero risk of intersecting or clipping through the head
        const armWave = Math.sin(now * 0.014) * 0.08;
        armL.rotation.set(-2.55, 0.15, 0.38 + armWave);
        armR.rotation.set(-2.55, -0.15, -0.38 - armWave);

        // Head looking up to heaven and church steeple
        head.rotation.set(-0.25, Math.sin(now * 0.008) * 0.12, 0);
        torso.rotation.set(-0.04, 0, 0);

        padreSkirt.rotation.x = 0;
        redSkirt.rotation.x = 0;
        blackSkirt.rotation.x = 0;
        acolitoSkirt.rotation.x = 0;
      } else if (action === 'praise') {
        // Praise & Worship: arms swaying side to side in front of the body
        playerGroup.position.y = 0;
        legL.rotation.set(0, 0, 0);
        legR.rotation.set(0, 0, 0);
        kneeL.rotation.set(0, 0, 0);
        kneeR.rotation.set(0, 0, 0);

        const sway = Math.sin(now * 0.005) * 0.45;

        // Torso and head sway rhythmically with the praise song
        torso.rotation.set(0, 0, sway * 0.12);
        head.rotation.set(-0.15, sway * 0.15, sway * 0.08);

        // Both arms held forward in front of the body, swaying left and right together in praise
        armL.rotation.set(-1.3, sway * 0.35, 0.32 + sway * 0.28);
        armR.rotation.set(-1.3, sway * 0.35, -0.32 + sway * 0.28);

        padreSkirt.rotation.x = 0;
        redSkirt.rotation.x = 0;
        blackSkirt.rotation.x = 0;
        acolitoSkirt.rotation.x = 0;
      } else {
        // Normal state: reset emote transforms
        playerGroup.position.y = 0;
        head.rotation.set(0, 0, 0);
        torso.rotation.set(0, 0, 0);
        padreSkirt.rotation.x = 0;
        redSkirt.rotation.x = 0;
        blackSkirt.rotation.x = 0;
        acolitoSkirt.rotation.x = 0;

        if (isMoving) {
          const stride = Math.sin(walkTime);
          legL.rotation.set(stride * 0.65, 0, 0);
          legR.rotation.set(-stride * 0.65, 0, 0);
          kneeL.rotation.set(stride > 0 ? stride * 0.35 : 0, 0, 0);
          kneeR.rotation.set(-stride > 0 ? -stride * 0.35 : 0, 0, 0);

          armL.rotation.set(-stride * 0.6, 0, 0.08);
          armR.rotation.set(stride * 0.6, 0, -0.08);
        } else {
          legL.rotation.set(0, 0, 0);
          legR.rotation.set(0, 0, 0);
          kneeL.rotation.set(0, 0, 0);
          kneeR.rotation.set(0, 0, 0);

          armL.rotation.set(0, 0, 0.08);
          armR.rotation.set(0, 0, -0.08);
        }
      }

      // Apply character rotation
      playerGroup.rotation.y = playerAngle;

      // Third-person camera tracking smoothly behind character
      const camDist = 20;
      const camHeight = 9 + cameraPitch * 8;
      const targetCamX = playerGroup.position.x + Math.sin(cameraAngle) * camDist;
      const targetCamZ = playerGroup.position.z + Math.cos(cameraAngle) * camDist;
      const targetCamY = playerGroup.position.y + camHeight;

      camera.position.x += (targetCamX - camera.position.x) * 0.15;
      camera.position.y += (targetCamY - camera.position.y) * 0.15;
      camera.position.z += (targetCamZ - camera.position.z) * 0.15;

      camera.lookAt(playerGroup.position.x, playerGroup.position.y + 6.0, playerGroup.position.z);
    };

    let lastTime = performance.now();
    const animate = () => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      stepPhysics(dt, now);
      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Global hook para gravação programática de alta fidelidade
    if (typeof window !== 'undefined') {
      (window as any).__recordWalkFrames = (frameCount = 90, fps = 30) => {
        const dt = 1 / fps;
        const frames: string[] = [];
        let virtualNow = performance.now();
        for (let i = 0; i < frameCount; i++) {
          virtualNow += dt * 1000;
          stepPhysics(dt, virtualNow);
          renderer.render(scene, camera);
          frames.push(renderer.domElement.toDataURL('image/jpeg', 0.88));
        }
        return frames;
      };
    }

    // Resize handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [city.code, world.parishes.length]); // ONLY teardown if city changes!

  return (
    <div
      ref={mountRef}
      className="walk-canvas-container"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' }}
    />
  );
}
