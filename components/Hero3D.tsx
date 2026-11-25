"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles, useTexture } from "@react-three/drei";
import * as THREE from "three";

// Plane matches the picture's 1402x1122 shape; it's scaled up to cover the screen
const W = 5;
const H = W * (1122 / 1402);

// Pointer (-1..1) from mouse, or from device tilt where the browser allows it
const input = { x: 0, y: 0 };

// "3D photo" shader: each pixel gets a fake depth (front bulls near, graffiti
// wall far) and is shifted by the pointer in proportion to it, so the layers
// move against each other.
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform vec2 offset;
  varying vec2 vUv;

  float depth(vec2 uv) {
    float low = smoothstep(0.95, 0.1, uv.y);                  // lower = closer
    float mid = 1.0 - smoothstep(0.0, 0.55, abs(uv.x - 0.5)); // center crew pops a bit
    return clamp(low * 0.75 + mid * low * 0.35, 0.0, 1.0);
  }

  void main() {
    vec2 uv = (vUv - 0.5) * 0.96 + 0.5;                       // slight zoom hides shifted edges
    uv += offset * (depth(vUv) - 0.35);                       // near moves one way, far the other
    gl_FragColor = vec4(texture2D(map, uv).rgb, 1.0);
    #include <colorspace_fragment>
  }
`;

function DepthPhoto({ still, onReady }: { still: boolean; onReady?: () => void }) {
  const texture = useTexture("/crew-hero.jpg", (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
  });
  const viewport = useThree((s) => s.viewport);
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useRef({ map: { value: texture }, offset: { value: new THREE.Vector2() } });

  // Like CSS background-size: cover, with a little extra so the tilt never shows an edge.
  // Anchored near the top so the CREW graffiti and the heads stay in view.
  const scale = Math.max(viewport.width / W, viewport.height / H) * 1.04;
  const shiftY = -((H * scale - viewport.height) / 2) * 0.85;

  // Texture is loaded once this renders (useTexture suspends until then)
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  useFrame(({ clock }) => {
    if (still || !mesh.current) return;
    const t = clock.getElapsedTime();
    // gentle idle drift so the depth reads even without a mouse
    const tx = input.x + Math.sin(t * 0.5) * 0.25;
    const ty = input.y + Math.cos(t * 0.4) * 0.15;
    const o = uniforms.current.offset.value;
    o.x = THREE.MathUtils.lerp(o.x, -tx * 0.03, 0.06);
    o.y = THREE.MathUtils.lerp(o.y, ty * 0.024, 0.06);
    mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, tx * 0.05, 0.05);
    mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, ty * 0.035, 0.05);
  });

  return (
    <mesh ref={mesh} scale={[scale, scale, 1]} position={[0, shiftY, 0]}>
      <planeGeometry args={[W, H, 1, 1]} />
      {/* eslint-disable-next-line react-hooks/refs -- three.js reads this uniforms object directly */}
      <shaderMaterial uniforms={uniforms.current} vertexShader={vertexShader} fragmentShader={fragmentShader} />
    </mesh>
  );
}

function Dust({ mobile, still }: { mobile: boolean; still: boolean }) {
  const { width, height } = useThree((s) => s.viewport);
  return (
    <>
      <Sparkles count={mobile ? 25 : 60} color="#ffffff" size={mobile ? 2.5 : 3} scale={[width, height, 2]} position={[0, 0, 0.8]} speed={still ? 0 : 0.35} />
      <Sparkles count={mobile ? 12 : 30} color="#9aa0a8" size={2} scale={[width, height, 2]} position={[0, 0, 0.6]} speed={still ? 0 : 0.25} />
    </>
  );
}

export default function Hero3D({ still = false, onReady }: { still?: boolean; onReady?: () => void }) {
  const mobile = useMemo(() => window.matchMedia("(max-width: 768px), (pointer: coarse)").matches, []);

  useEffect(() => {
    if (still) return;
    const onMove = (e: PointerEvent) => {
      input.x = (e.clientX / window.innerWidth) * 2 - 1;
      input.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    // Device tilt (works without a permission prompt on Android; iOS keeps the idle drift)
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
      flat
      dpr={mobile ? [1, 1.5] : [1, 1.75]}
      frameloop={still ? "demand" : "always"}
      camera={{ position: [0, 0, 6.6], fov: 35 }}
      gl={{ antialias: false, alpha: true }}
      aria-hidden
    >
      <DepthPhoto still={still} onReady={onReady} />
      <Dust mobile={mobile} still={still} />
    </Canvas>
  );
}
