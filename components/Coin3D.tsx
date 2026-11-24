"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer, Sparkles } from "@react-three/drei";
import * as THREE from "three";

const RADIUS = 1.6;
const THICK = 0.2;

// Pointer (-1..1) from mouse, or from device tilt where the browser allows it
const input = { x: 0, y: 0 };

function displayFont() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-anton").trim();
  return v || "Impact, sans-serif";
}

// Draws the coin face: a color map (gold field, brighter letters) and a bump map
// (white = raised) so "$CREW" looks embossed under real lighting.
function drawFace(color: HTMLCanvasElement, bump: HTMLCanvasElement) {
  const S = color.width;
  const font = `${S * 0.25}px ${displayFont()}`;

  const c = color.getContext("2d")!;
  const field = c.createRadialGradient(S * 0.4, S * 0.35, S * 0.05, S / 2, S / 2, S * 0.55);
  field.addColorStop(0, "#ffe8a3");
  field.addColorStop(0.5, "#e0ae38");
  field.addColorStop(1, "#b9861a");
  c.fillStyle = field;
  c.fillRect(0, 0, S, S);

  const b = bump.getContext("2d")!;
  b.fillStyle = "#000";
  b.fillRect(0, 0, S, S);

  for (const [ctx, fill, stroke] of [
    [c, "#ffdf7a", "#ffe8a3"],
    [b, "#fff", "#bbb"],
  ] as const) {
    // inner ring + dots
    ctx.strokeStyle = stroke;
    ctx.lineWidth = S * 0.014;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = stroke;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(S / 2 + Math.cos(a) * S * 0.445, S / 2 + Math.sin(a) * S * 0.445, S * 0.01, 0, Math.PI * 2);
      ctx.fill();
    }
    // $CREW lettering
    ctx.fillStyle = fill;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$CREW", S / 2, S / 2 + S * 0.01);
  }
}

function useFaceTextures(size: number) {
  const textures = useMemo(() => {
    const color = document.createElement("canvas");
    const bump = document.createElement("canvas");
    color.width = color.height = bump.width = bump.height = size;
    drawFace(color, bump);
    const map = new THREE.CanvasTexture(color);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const bumpMap = new THREE.CanvasTexture(bump);
    return { color, bump, map, bumpMap };
  }, [size]);

  // Redraw once the display font has loaded so the canvas uses it
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => {
      if (!alive) return;
      drawFace(textures.color, textures.bump);
      textures.map.needsUpdate = true;
      textures.bumpMap.needsUpdate = true;
    });
    return () => {
      alive = false;
      textures.map.dispose();
      textures.bumpMap.dispose();
    };
  }, [textures]);

  return textures;
}

function useEdgeTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 16;
    const ctx = c.getContext("2d")!;
    for (let x = 0; x < c.width; x += 4) {
      ctx.fillStyle = x % 8 === 0 ? "#fff" : "#444";
      ctx.fillRect(x, 0, 4, c.height);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = 4;
    return t;
  }, []);
}

function Coin({ mobile, still }: { mobile: boolean; still: boolean }) {
  const tiltRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const { map, bumpMap } = useFaceTextures(mobile ? 512 : 1024);
  const edge = useEdgeTexture();

  useFrame((_, dt) => {
    if (still) return;
    if (spinRef.current) spinRef.current.rotation.y += dt * 0.45;
    if (tiltRef.current) {
      // ease toward the pointer for a gentle "looks at you" tilt
      tiltRef.current.rotation.x = THREE.MathUtils.lerp(tiltRef.current.rotation.x, -input.y * 0.35, 0.06);
      tiltRef.current.rotation.z = THREE.MathUtils.lerp(tiltRef.current.rotation.z, -input.x * 0.15, 0.06);
      tiltRef.current.position.x = THREE.MathUtils.lerp(tiltRef.current.position.x, input.x * 0.15, 0.06);
    }
  });

  const gold = { color: "#f5c542", metalness: 1, roughness: 0.25 } as const;

  return (
    <group ref={tiltRef}>
      <group ref={spinRef} rotation={still ? [0, -0.35, 0] : [0, 0, 0]}>
        {/* body + reeded edge */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[RADIUS, RADIUS, THICK, mobile ? 64 : 128, 1, true]} />
          <meshStandardMaterial {...gold} roughness={0.3} bumpMap={edge} bumpScale={2} />
        </mesh>
        {/* raised rims */}
        {[THICK / 2, -THICK / 2].map((z) => (
          <mesh key={z} position={[0, 0, z]}>
            <torusGeometry args={[RADIUS - 0.04, 0.06, 16, mobile ? 64 : 128]} />
            <meshStandardMaterial {...gold} roughness={0.2} />
          </mesh>
        ))}
        {/* front and back faces (back is turned so the text reads correctly) */}
        {[0, Math.PI].map((ry) => (
          <mesh key={ry} rotation={[0, ry, 0]} position={[0, 0, ry === 0 ? THICK / 2 : -THICK / 2]}>
            <circleGeometry args={[RADIUS - 0.03, mobile ? 64 : 128]} />
            <meshStandardMaterial
              color="#ffffff"
              map={map}
              bumpMap={bumpMap}
              bumpScale={6}
              metalness={1}
              roughness={0.25}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function Coin3D({ still = false }: { still?: boolean }) {
  const mobile = useMemo(
    () => window.matchMedia("(max-width: 768px), (pointer: coarse)").matches,
    []
  );

  useEffect(() => {
    if (still) return;
    const onMove = (e: PointerEvent) => {
      input.x = (e.clientX / window.innerWidth) * 2 - 1;
      input.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    // Device tilt (works without a permission prompt on Android; iOS needs one, so it just stays still)
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      input.x = THREE.MathUtils.clamp(e.gamma / 30, -1, 1);
      input.y = THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("deviceorientation", onTilt);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, [still]);

  return (
    <Canvas
      dpr={mobile ? [1, 1.5] : [1, 2]}
      frameloop={still ? "demand" : "always"}
      camera={{ position: [0, 0, 6.2], fov: 35 }}
      gl={{ antialias: !mobile, alpha: true, powerPreference: "high-performance" }}
      aria-hidden
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      {/* neon green rim lights from behind */}
      <directionalLight position={[-4, 1.5, -3]} intensity={1.4} color="#84d40b" />
      <directionalLight position={[4, -1.5, -2]} intensity={0.8} color="#c8ff3a" />

      {/* Local studio environment: gives the metal something to reflect, no network fetch */}
      <Environment resolution={mobile ? 128 : 256}>
        <Lightformer form="rect" intensity={3} position={[0, 5, -2]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={2} color="#ffe8a3" position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[5, -1, 2]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#84d40b" position={[0, -4, -3]} scale={[10, 1, 1]} />
        <Lightformer form="ring" intensity={2} position={[0, 0, 6]} scale={3} />
      </Environment>

      <Float speed={still ? 0 : 1.5} rotationIntensity={0.15} floatIntensity={0.5}>
        <Coin mobile={mobile} still={still} />
      </Float>
      <Sparkles count={mobile ? 18 : 50} color="#f5c542" size={mobile ? 2.5 : 3} scale={[9, 6, 4]} position={[0, 0, -1.5]} speed={still ? 0 : 0.35} />
      <Sparkles count={mobile ? 10 : 30} color="#a8e600" size={mobile ? 2 : 2.5} scale={[9, 6, 4]} position={[0, 0, -1.5]} speed={still ? 0 : 0.3} />
    </Canvas>
  );
}
