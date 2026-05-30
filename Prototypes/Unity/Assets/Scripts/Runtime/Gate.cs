using UnityEngine;
using UnityEngine.Events;

namespace WrongWorld.AbsurdRunner
{
    public enum GateEffectType
    {
        AddSquad,
        RemoveSquad,
        DamageMultiplier,
        FireRateMultiplier,
        Shield,
        RocketVolley,
        FreezeEnemies,
        AreaDamage
    }

    [RequireComponent(typeof(Collider))]
    public sealed class Gate : MonoBehaviour
    {
        [SerializeField] private GateEffectType effectType = GateEffectType.AddSquad;
        [SerializeField] private int squadAmount = 5;
        [SerializeField] private float multiplier = 2f;
        [SerializeField] private float duration = 8f;
        [SerializeField] private bool destroyAfterUse = true;

        public UnityEvent<GateEffectType> Triggered;
        public UnityEvent RocketVolleyRequested;
        public UnityEvent<float> FreezeRequested;
        public UnityEvent AreaDamageRequested;

        private bool used;

        private void Reset()
        {
            Collider gateCollider = GetComponent<Collider>();
            gateCollider.isTrigger = true;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (used || !other.TryGetComponent(out PlayerController player))
            {
                return;
            }

            used = true;
            Apply(player);
            Triggered?.Invoke(effectType);

            if (destroyAfterUse)
            {
                Destroy(gameObject);
            }
        }

        private void Apply(PlayerController player)
        {
            switch (effectType)
            {
                case GateEffectType.AddSquad:
                    player.AddSquad(squadAmount);
                    break;
                case GateEffectType.RemoveSquad:
                    player.RemoveSquad(Mathf.Abs(squadAmount));
                    break;
                case GateEffectType.DamageMultiplier:
                    player.ApplyDamageMultiplier(multiplier, duration);
                    break;
                case GateEffectType.FireRateMultiplier:
                    player.ApplyFireRateMultiplier(multiplier, duration);
                    break;
                case GateEffectType.Shield:
                    player.ActivateShield();
                    break;
                case GateEffectType.RocketVolley:
                    RocketVolleyRequested?.Invoke();
                    break;
                case GateEffectType.FreezeEnemies:
                    FreezeRequested?.Invoke(duration);
                    break;
                case GateEffectType.AreaDamage:
                    AreaDamageRequested?.Invoke();
                    break;
                default:
                    Debug.LogWarning($"Unhandled gate effect: {effectType}", this);
                    break;
            }
        }
    }
}
