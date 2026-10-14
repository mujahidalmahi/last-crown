# Architecture Overview

## System Components

```mermaid
flowchart TD
    subgraph Browser ["Client Application (apps/web)"]
        Next["Next.js App Router UI"]
        Phaser["Phaser 3 Canvas"]
        Sound["Web Audio Synthesizer"]
        Renderer["WarriorRenderer & Effects"]
        ColyseusClient["Colyseus.js Client"]
    end

    subgraph Core ["Shared Game Core (@last-crown/game-core)"]
        Sim["GameSimulation (Deterministic)"]
        FSM["WarriorStateMachine"]
        Combat["CombatController"]
        Physics["KinematicPhysicsAdapter"]
        AI["WarriorBotAI"]
    end

    subgraph Config ["Configuration (@last-crown/game-config)"]
        Presets["Warrior Presets (Knight, Duelist, Vanguard)"]
        Attacks["Attack Definitions (Light, Heavy, Thrust)"]
        Arenas["Arena Boundaries (Bastion, Sanctum)"]
        Balance["Timings, Parry Windows & Stamina"]
    end

    subgraph Server ["Multiplayer Server (apps/server)"]
        Express["Express HTTP Endpoints"]
        BattleRoom["Colyseus BattleRoom (60Hz)"]
        Registry["RoomRegistry & RateLimiter"]
    end

    Next --> Phaser
    Phaser --> Renderer
    Phaser --> Sound
    Phaser --> Sim
    Sim --> FSM
    Sim --> Combat
    Sim --> Physics
    Sim --> Presets
    Sim --> Attacks
    Sim --> Arenas
    Sim --> Balance
    AI --> Sim
    ColyseusClient <-->|WebSocket State Sync| BattleRoom
    BattleRoom --> Sim
    Express --> Registry
```

## Architectural Boundaries

1. **Presentation Separation**: React components in `apps/web` own page routing, menus, dialogue overlays, and settings. Phaser owns the real-time game canvas, sprite rendering, camera effects, and audio synthesis.
2. **Headless Game Core**: `@last-crown/game-core` contains zero references to DOM elements, browser APIs, React hooks, or server WebSockets. This allows identical combat code to run offline in the browser and headlessly inside Node.js server rooms.
3. **Zero Client Trust**: Damage calculations, collision confirmations, and state changes are executed exclusively by `GameSimulation`. In multiplayer, the server's simulation is authoritative.
