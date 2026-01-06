# 🚀 USS Enterprise NCC-1701 Flight Simulator

[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2.3-61dafb?logo=react)](https://reactjs.org)
[![Three.js](https://img.shields.io/badge/Three.js-0.182.0-000000?logo=three.js)](https://threejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> An immersive, browser-based 3D flight simulator featuring the iconic USS Enterprise from Star Trek. Experience warp drive, photon torpedoes, destructible planets, and an interactive bridge interior — all rendered in real-time 3D.

**🎮 [Play Live Demo](https://star-trek-kappa.vercel.app)** | **📊 [View Analysis](./PROJECT_ANALYSIS.md)**

![Star Trek Enterprise Flight Simulator](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)

---

## ✨ Features

### 🛸 Flight Simulation
- **Newtonian Physics Engine** - Experience realistic momentum and inertia in space
- **WASD Flight Controls** - Intuitive keyboard controls with 6-axis movement
- **Multiple Camera Modes** - Flight, free-look, cinematic, photo mode, and first-person bridge view
- **Dynamic Environment** - Explore our entire solar system with 30+ celestial bodies

### ⚡ Warp Drive System
- **Warp Factors 1-9** - Travel faster than light with authentic Star Trek warp mechanics
- **Automated Navigation** - Select any destination and engage warp drive
- **Visual Effects** - Warp bubble, speed streaks, and dramatic warp flash animations
- **ETA Calculation** - Real-time travel time estimates based on distance and warp factor

### 🔫 Weapons Systems
- **Type-II Phasers** - Continuous beam weapons with charge-and-fire mechanics
- **Photon Torpedoes** - Physics-based projectile weapons with explosive impacts
- **Targeting System** - Cycle through targets with intelligent auto-targeting
- **Destructible Planets** - Every celestial body has health and can be destroyed with spectacular effects

### 🖥️ Bridge Interior (NEW!)
- **First-Person Perspective** - Walk the bridge of the USS Enterprise
- **6 Interactive Stations** - Captain's chair, helm, navigation, tactical, operations, engineering
- **Click-to-Teleport** - Navigate between stations with a single click
- **Seated Controls** - Full flight controls available while sitting in the captain's chair

### 🎨 LCARS Interface
- **Authentic Star Trek UI** - Inspired by the iconic LCARS (Library Computer Access/Retrieval System)
- **Comprehensive HUD** - System readouts, navigation, radar, and tactical displays
- **Ship Systems Monitor** - Real-time shields, hull integrity, and power systems
- **Responsive Design** - Scales beautifully across all screen sizes

### 🔊 Audio & Immersion
- **Voice Announcements** - Computer-generated status updates and alerts
- **Sound Effects** - Warp drive, weapons fire, shield impacts, and UI interactions
- **Red Alert System** - Visual and audio warnings for combat situations
- **Spatial Audio** - Directional sound effects for enhanced immersion

### 💾 Additional Features
- **Save/Load System** - Multiple save slots with quick-save support
- **Settings Panel** - Customize graphics quality, audio, and gameplay options
- **Tutorial System** - Interactive first-visit guide
- **Performance Optimization** - Adaptive quality settings based on FPS
- **Post-Processing** - Bloom, chromatic aberration, vignette, and film grain effects

---

## 🎮 Controls

### Flight Controls
| Key | Action |
|-----|--------|
| `W` / `S` | Forward / Reverse thrust |
| `A` / `D` | Strafe left / right |
| `Q` / `E` | Roll left / right |
| `1-9` | Set warp factor |
| `SPACE` | Engage warp drive |

### Weapons & Targeting
| Key | Action |
|-----|--------|
| `P` (hold) | Fire phasers |
| `G` | Launch photon torpedo |
| `N` | Cycle weapon targets |

### Camera Controls
| Key | Action |
|-----|--------|
| `I` | Toggle free-look mode |
| `C` | Toggle cinematic camera |
| `B` | Toggle bridge view (interior) |
| `Shift + P` | Toggle photo mode |
| `H` | Return to flight camera |

### Bridge Mode (Press `B`)
| Action | Control |
|--------|---------|
| Teleport to station | Click floor/console |
| Sit in captain's chair | Walk near + press `E` |
| Stand up | Press `E` while seated |
| All flight controls | Available while seated |

### Navigation & Interface
| Key | Action |
|-----|--------|
| `V` | Open destination selector |
| `TAB` | Toggle UI panels |
| `M` | Toggle audio |
| `?` | Toggle help/controls |
| `Shift + R` | Toggle radar display |
| `O` | Toggle orbit lines |
| `ESC` | Pause menu / Close menus |
| `Ctrl + S` | Quick save |

### Mouse Controls (Free-Look Mode)
- **Left Drag** - Rotate camera
- **Scroll** - Zoom in/out
- **Right Drag** - Pan camera

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ and npm/yarn/pnpm/bun

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/paarthbhatt/Star-Trek.git
   cd Star-Trek
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

---

## 🏗️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16.1.1** | React framework with App Router |
| **React 19.2.3** | UI library |
| **Three.js 0.182.0** | 3D graphics engine |
| **@react-three/fiber** | React renderer for Three.js |
| **@react-three/drei** | Useful helpers for React Three Fiber |
| **@react-three/postprocessing** | Post-processing effects |
| **Framer Motion** | Animation library |
| **Tailwind CSS 4** | Utility-first CSS framework |
| **TypeScript 5** | Type safety |
| **Zustand** | State management |

---

## 📁 Project Structure

```
startrek/
├── public/
│   └── models/
│       ├── enterprise.glb       # 4.8 MB exterior ship model
│       └── bridge.glb            # 111 MB interior bridge model
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main application entry (870 lines)
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Global styles
│   ├── components/
│   │   ├── bridge/               # Bridge interior system
│   │   ├── effects/              # Visual effects
│   │   ├── enterprise/           # Ship model components
│   │   ├── environment/          # Space environment
│   │   ├── ui/                   # User interface components
│   │   ├── weapons/              # Weapon systems
│   │   ├── LoadingScreen.tsx
│   │   └── Scene.tsx             # Main 3D scene (1,014 lines)
│   ├── data/
│   │   ├── bridgeStations.ts    # Bridge station positions
│   │   ├── destinations.ts       # Solar system data
│   │   ├── shipData.ts           # Enterprise specifications
│   │   └── voiceLines.ts         # Voice announcements
│   ├── hooks/                    # 15 custom hooks
│   │   ├── useFlightControls.ts
│   │   ├── useWarpDrive.ts
│   │   ├── useWeapons.ts
│   │   ├── useCameraMode.ts
│   │   ├── useBridgeMode.ts
│   │   └── ... 
│   ├── shaders/
│   │   ├── atmosphere.ts         # Planet atmospheres
│   │   ├── nebula.ts             # Nebula effects
│   │   └── procedural.ts         # Procedural textures
│   └── types/
│       └── index.ts              # TypeScript definitions
└── scripts/
    └── inspectBridge.js          # GLB model inspector
```

---

## 🎯 Key Highlights

- **16,345 Lines of Code** across 68 TypeScript files
- **30+ Celestial Bodies** to explore (planets, moons, stations, asteroids)
- **5 Camera Modes** including unique first-person bridge view
- **6 Interactive Bridge Stations** with click-to-teleport navigation
- **Production-Ready** with 80% feature completeness
- **Fully Typed** with TypeScript strict mode
- **Performance Optimized** with adaptive quality settings
- **Browser-Based** - No installation required!

---

## 🎓 Learning Resources

This project demonstrates advanced concepts in:
- **3D Graphics** - Custom shaders, particle systems, physics simulation
- **React Patterns** - Custom hooks, composition, performance optimization
- **Game Development** - State machines, input handling, save systems
- **TypeScript** - Advanced types, generics, strict mode
- **Web Audio API** - Sound management and spatial audio

For a detailed technical breakdown, see [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md)

---

## 🚀 Future Enhancements

- [ ] Mission system with objectives
- [ ] Crew management
- [ ] VR support
- [ ] Multiplayer/co-op
- [ ] More ships (Defiant, Voyager, etc.)
- [ ] Other star systems
- [ ] Gamepad support
- [ ] Engineering section and transporter room

---

## 🐛 Known Issues

- Bridge station positions are approximate (GLB model has no named nodes)
- Large bridge model (111 MB) requires loading time on first visit
- Simplified physics - not true orbital mechanics
- Browser-only (no native app version)

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🖖 Acknowledgments

- **Star Trek** - Created by Gene Roddenberry
- **Three.js Community** - For the incredible 3D library
- **React Three Fiber** - For bridging React and Three.js
- **Vercel** - For hosting and deployment

---

## 🌟 Star This Repo!

If you enjoyed this project or found it useful, please consider giving it a ⭐ on GitHub! 

---

<div align="center">

**Live long and prosper! 🖖**

[Report Bug](https://github.com/paarthbhatt/Star-Trek/issues) · [Request Feature](https://github.com/paarthbhatt/Star-Trek/issues) · [View Demo](https://star-trek-kappa.vercel.app)

</div>