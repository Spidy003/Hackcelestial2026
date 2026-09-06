'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Bot, Sparkles, X, ChevronDown, ChevronUp, MessageSquare, Volume2 } from 'lucide-react'

const AGENT_QUOTES = [
  "⚡ ResortierAi Active: 8 Autonomous Agents synchronised.",
  "🤖 Monitoring 84 keys across Garden, Sea View & Suite Wings.",
  "✨ Predictive turnaround: Housekeeping dispatched within SLA.",
  "🛡️ ₹3.4L+ Revenue secured via proactive micro-interventions.",
  "🌊 Coastal microclimate optimal: 28°C Partly Cloudy.",
  "🎯 GERS Alert: 0 guests at risk • Sentiment index 94% positive."
]

export default function FloatingAgent3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [minimized, setMinimized] = useState(false)
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [showQuote, setShowQuote] = useState(true)
  const [loading, setLoading] = useState(true)

  // Interaction refs
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const spinRef = useRef(0)

  // Cycle quotes every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % AGENT_QUOTES.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 220
    const height = container.clientHeight || 220

    // 1. Scene & Camera
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 0.4, 3.2)

    // 2. Renderer with transparent background
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4)
    scene.add(ambientLight)

    const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 2.5)
    dirLight1.position.set(3, 4, 3)
    scene.add(dirLight1)

    const dirLight2 = new THREE.DirectionalLight(0x00ff66, 1.8)
    dirLight2.position.set(-3, -2, -2)
    scene.add(dirLight2)

    const pointLight = new THREE.PointLight(0x38bdf8, 2, 8)
    pointLight.position.set(0, 0, 1.5)
    scene.add(pointLight)

    // 4. Model Loading
    let model: THREE.Group | null = null
    let mixer: THREE.AnimationMixer | null = null
    const clock = new THREE.Clock()

    const loader = new GLTFLoader()
    loader.load(
      '/robot.glb',
      (gltf) => {
        model = gltf.scene

        // Auto-fit / Center model
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())

        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 1.6 / (maxDim || 1)
        model.scale.setScalar(scale)
        model.position.sub(center.multiplyScalar(scale))
        model.position.y -= 0.1

        scene.add(model)

        // Play embedded animations if any
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model)
          const action = mixer.clipAction(gltf.animations[0])
          action.play()
        }

        setLoading(false)
      },
      undefined,
      (error) => {
        console.warn('Could not load /robot.glb, trying fallback path...', error)
        loader.load('/futuristic_flying_animated_robot_-_low_poly.glb', (gltf2) => {
          model = gltf2.scene
          const box = new THREE.Box3().setFromObject(model)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = 1.6 / (maxDim || 1)
          model.scale.setScalar(scale)
          model.position.sub(center.multiplyScalar(scale))
          scene.add(model)
          if (gltf2.animations && gltf2.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model)
            mixer.clipAction(gltf2.animations[0]).play()
          }
          setLoading(false)
        })
      }
    )

    // 5. Mouse tracking across window
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      // Calculate offset from container center
      const dx = (e.clientX - centerX) / window.innerWidth
      const dy = (e.clientY - centerY) / window.innerHeight
      mouseRef.current.targetX = Math.max(-0.6, Math.min(0.6, dx * 2.2))
      mouseRef.current.targetY = Math.max(-0.4, Math.min(0.4, dy * 2.0))
    }

    window.addEventListener('mousemove', handleMouseMove)

    // 6. Animation Loop
    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      const delta = clock.getDelta()
      const elapsed = clock.getElapsedTime()

      if (mixer) {
        mixer.update(delta)
      }

      // Smooth mouse interpolation
      mouseRef.current.x = THREE.MathUtils.lerp(mouseRef.current.x, mouseRef.current.targetX, 0.08)
      mouseRef.current.y = THREE.MathUtils.lerp(mouseRef.current.y, mouseRef.current.targetY, 0.08)

      // Spin decay on click
      if (spinRef.current > 0.001) {
        spinRef.current *= 0.92
      } else {
        spinRef.current = 0
      }

      if (model) {
        // Breathing up & down floating sine wave
        const floatY = Math.sin(elapsed * 2.2) * 0.12
        model.position.y = -0.1 + floatY

        // Slight breathing scale expansion
        const breathScale = 1.0 + Math.sin(elapsed * 2.8) * 0.018
        model.scale.setScalar(breathScale * 1.5)

        // Mouse look-at rotation + gentle idle tilt + click spin
        const idleSwayX = Math.sin(elapsed * 1.6) * 0.06
        const idleSwayZ = Math.cos(elapsed * 1.4) * 0.05

        model.rotation.y = mouseRef.current.x * 1.2 + (spinRef.current * Math.PI * 2)
        model.rotation.x = -mouseRef.current.y * 0.8 + idleSwayX
        model.rotation.z = -mouseRef.current.x * 0.3 + idleSwayZ
      }

      renderer.render(scene, camera)
    }

    animate()

    // 7. Resize Observer
    const ro = new ResizeObserver(() => {
      if (!container) return
      const w = container.clientWidth || 220
      const h = container.clientHeight || 220
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    ro.observe(container)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', handleMouseMove)
      ro.disconnect()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [minimized])

  const handleBotClick = () => {
    // Trigger fun spin
    spinRef.current = 2.0
    // Cycle quote
    setQuoteIndex((prev) => (prev + 1) % AGENT_QUOTES.length)
    setShowQuote(true)
  }

  return (
    <div className="fixed bottom-3 left-3 z-40 select-none flex flex-col items-start pointer-events-none">
      {/* Speech / Status Bubble */}
      {!minimized && showQuote && (
        <div 
          onClick={handleBotClick}
          className="pointer-events-auto mb-2 max-w-[260px] p-2.5 rounded-2xl bg-[#090f14]/95 backdrop-blur-md border border-cyan-500/40 shadow-[0_8px_24px_rgba(0,0,0,0.6),0_0_12px_rgba(0,240,255,0.2)] text-white animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer group hover:border-[#00ff66]/60 transition-all"
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 text-[10px] font-pixel text-[#00ff66]">
              <Sparkles className="w-3 h-3 text-[#00f0ff] animate-pulse" />
              <span>RESORTIER BOT</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowQuote(false)
              }}
              className="text-slate-400 hover:text-white p-0.5 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="font-mono-data text-[11px] text-slate-200 leading-snug">
            {AGENT_QUOTES[quoteIndex]}
          </p>
          <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400 font-mono">
            <span className="text-[#00f0ff] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] inline-block animate-ping" />
              Interactive • Click to Spin
            </span>
            <span>Tap next →</span>
          </div>
        </div>
      )}

      {/* Main Bot Container */}
      <div className="pointer-events-auto relative group">
        {!minimized ? (
          <div className="relative flex flex-col items-center">
            {/* 3D Canvas Mount */}
            <div
              ref={mountRef}
              onClick={handleBotClick}
              title="Click ResortierAi 3D Bot to interact!"
              className="w-48 h-48 sm:w-56 sm:h-56 cursor-grab active:cursor-grabbing relative flex items-center justify-center filter drop-shadow-[0_10px_20px_rgba(0,240,255,0.3)] transition-transform hover:scale-105"
            >
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-cyan-400">
                  <Bot className="w-8 h-8 animate-bounce" />
                  <span className="text-[10px] font-pixel tracking-wider">INITIALISING 3D BOT...</span>
                </div>
              )}
            </div>

            {/* Bottom Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#0a1014]/90 border border-cyan-500/40 shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur text-white text-[10px] font-mono-data">
              <span className="w-2 h-2 rounded-full bg-[#00ff66] shadow-[0_0_8px_#00ff66] animate-pulse" />
              <span className="font-bold text-[#00f0ff] font-pixel text-[9px]">RESORTIER-3D</span>
              <span className="text-slate-400">|</span>
              <button
                onClick={() => setShowQuote(!showQuote)}
                className="text-slate-300 hover:text-[#00ff66] transition-colors"
                title="Toggle dialogue"
              >
                <MessageSquare className="w-3 h-3" />
              </button>
              <button
                onClick={() => setMinimized(true)}
                className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                title="Minimize 3D Agent"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Minimized Compact Badge */
          <button
            onClick={() => setMinimized(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#0a1014]/95 border-2 border-cyan-400/80 shadow-[0_4px_16px_rgba(0,240,255,0.4)] hover:border-[#00ff66] text-white transition-all transform hover:scale-105 cursor-pointer"
            title="Expand Resortier 3D Agent"
          >
            <div className="w-5 h-5 rounded-full bg-cyan-950 flex items-center justify-center border border-cyan-400/60 p-0.5">
              <img src="/resortier_ai_logo.png" alt="Bot" className="w-full h-full object-contain" />
            </div>
            <span className="font-pixel text-[9px] text-[#00ff66] tracking-wider">
              3D AGENT
            </span>
            <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  )
}
