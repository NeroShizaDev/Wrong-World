# Unity prototype starter scripts

This folder contains portable C# starter scripts for the absurd Android portrait-runner MVP described in `docs/absurd-runner-mvp.md`.

## Quick Unity setup

1. Create a Unity 3D project.
2. Copy `Assets/Scripts/Runtime` into the Unity project's `Assets/Scripts/Runtime` folder.
3. Create a `PlayerSquad` object with:
   - `PlayerController`
   - `AutoShooter`
   - trigger/collision collider
   - child `FirePoint` transform
4. Create prefabs for:
   - `Projectile` with trigger collider and `Projectile` script
   - enemies with trigger collider and `EnemyBase`
   - gates with trigger collider and `Gate`
5. Set the camera for portrait gameplay and clamp the player with `horizontalLimit`.

These scripts are intentionally MVP-sized: they favor readable behavior over production pooling, save systems, analytics, or monetization SDK integrations.
