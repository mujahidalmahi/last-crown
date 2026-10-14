# Combat System Design

## Core Mechanics

### 1. Attack Phases

Every sword technique operates on three distinct phases:

- **Wind-up (160ms - 340ms)**: Telegraphed wind-up giving opponents time to react.
- **Active (100ms - 160ms)**: Weapon hitbox is live and tests collision against the opponent's hurtbox.
- **Recovery (220ms - 400ms)**: Weapon swing completes; warrior cannot attack or block until recovery finishes.

### 2. Blocking vs. Parrying

- **Blocking**:
  - Held with `K` or `Shift`.
  - Absorbs 75% of incoming damage; 25% bleeds through as chip damage.
  - Consumes stamina proportional to the attack's damage.
  - Greatly reduces hitstun (down to 40%).
- **Parrying**:
  - Activated by a tap of `L` or `Alt`.
  - 150ms vulnerability window.
  - If struck during the parry window by an opponent facing you, the strike is deflected:
    - Defender takes **0 damage**.
    - Attacker is staggered into a **650ms counter-stun**.
    - Defender gains frame advantage to deliver an unblockable riposte!

### 3. Stamina Economics

- Maximum Stamina: 100 points (110 for Duelist, 90 for Vanguard).
- Attacking costs 15 to 30 stamina.
- Parrying costs 15 stamina.
- Blocking drains stamina upon impact.
- Stamina regenerates after a 600ms inactivity delay at 25 points/second.
- If stamina hits 0, the warrior enters an exhausted state with halved movement speed.
