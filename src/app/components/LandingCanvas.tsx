"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface LandingCanvasProps {
  scrollProgress: number; // 0 to 1
}

export default function LandingCanvas({ scrollProgress }: LandingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(scrollProgress);
  scrollRef.current = scrollProgress;

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffffff, 0.02);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    containerRef.current.appendChild(renderer.domElement);

    // 2. Central Architectural Structure (TorusKnot + Outer Wireframe Icosahedron)
    const mainGroup = new THREE.Group();

    // Inner Metallic Core Geometry (Rich Dark Coffee)
    const coreGeometry = new THREE.TorusKnotGeometry(2.8, 0.85, 128, 32);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x3e2723,
      emissive: 0x291814,
      roughness: 0.2,
      metalness: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    mainGroup.add(coreMesh);

    // Outer Architectural Cage (Warm Coffee/Caramel Wireframe)
    const cageGeometry = new THREE.IcosahedronGeometry(5.2, 2);
    const cageMaterial = new THREE.MeshBasicMaterial({
      color: 0xba6d4e,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const cageMesh = new THREE.Mesh(cageGeometry, cageMaterial);
    mainGroup.add(cageMesh);

    // Secondary Floating Orbit Rings
    const ringGeometry = new THREE.TorusGeometry(7.5, 0.08, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xc68e58,
      transparent: true,
      opacity: 0.35,
    });
    const ringMesh1 = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh1.rotation.x = Math.PI / 3;
    mainGroup.add(ringMesh1);

    const ringMesh2 = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh2.rotation.y = Math.PI / 4;
    mainGroup.add(ringMesh2);

    scene.add(mainGroup);

    // 3. Floating Particle Ember Field (Caramel/Coffee Warm Points)
    const particleCount = 1200;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 45;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 45;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 45;
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xba6d4e,
      size: 0.2,
      transparent: true,
      opacity: 0.5,
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // 4. Lighting Engine for White Background
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const warmPointLight = new THREE.PointLight(0xba6d4e, 6, 60);
    warmPointLight.position.set(12, 12, 12);
    scene.add(warmPointLight);

    const coffeePointLight = new THREE.PointLight(0x3e2723, 8, 60);
    coffeePointLight.position.set(-12, -12, -5);
    scene.add(coffeePointLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
    directionalLight.position.set(5, 20, 15);
    scene.add(directionalLight);

    // 5. Mouse Parallax Motion
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // 6. Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // 7. Animation Loop with Smooth Interpolation & Scroll Morphing
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      const progress = scrollRef.current;

      // Base rotation
      mainGroup.rotation.x += 0.003 + progress * 0.005;
      mainGroup.rotation.y += 0.006 + progress * 0.008;

      // Mouse influence
      mainGroup.rotation.x += mouseY * 0.005;
      mainGroup.rotation.y += mouseX * 0.005;

      ringMesh1.rotation.z += 0.002;
      ringMesh2.rotation.z -= 0.003;

      // Particle subtle motion
      particleSystem.rotation.y += 0.0008;
      particleSystem.rotation.x += 0.0004;

      const targetX =
        progress < 0.3
          ? Math.sin(progress * Math.PI * 2) * 5
          : progress < 0.7
          ? -Math.cos(progress * Math.PI * 2) * 5
          : 0;

      const targetY = (progress - 0.5) * 4;
      const targetZ = 18 - progress * 10;

      camera.position.x += (targetX + mouseX * 1.5 - camera.position.x) * 0.04;
      camera.position.y += (-targetY - mouseY * 1.5 - camera.position.y) * 0.04;
      camera.position.z += (targetZ - camera.position.z) * 0.04;

      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // 8. Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }

      coreGeometry.dispose();
      coreMaterial.dispose();
      cageGeometry.dispose();
      cageMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 w-full h-full overflow-hidden"
    />
  );
}
