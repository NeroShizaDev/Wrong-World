using UnityEngine;
using UnityEngine.Events;

namespace WrongWorld.AbsurdRunner
{
    [RequireComponent(typeof(Collider))]
    public class EnemyBase : MonoBehaviour, IDamageable
    {
        [Header("Stats")]
        [SerializeField] private float maxHealth = 20f;
        [SerializeField] private float moveSpeed = 2.5f;
        [SerializeField] private int contactSquadDamage = 1;
        [SerializeField] private int coinReward = 1;

        [Header("Optional Events")]
        public UnityEvent<float, float> HealthChanged;
        public UnityEvent<int> Died;

        private float health;
        private bool dead;

        protected virtual void Awake()
        {
            health = maxHealth;
            HealthChanged?.Invoke(health, maxHealth);
        }

        protected virtual void Update()
        {
            if (dead)
            {
                return;
            }

            transform.position += Vector3.back * moveSpeed * Time.deltaTime;
        }

        public virtual void TakeDamage(float amount, GameObject source)
        {
            if (dead || amount <= 0f)
            {
                return;
            }

            health = Mathf.Max(0f, health - amount);
            HealthChanged?.Invoke(health, maxHealth);

            if (health <= 0f)
            {
                Die();
            }
        }

        protected virtual void Die()
        {
            dead = true;
            Died?.Invoke(coinReward);
            Destroy(gameObject);
        }

        private void OnTriggerEnter(Collider other)
        {
            if (dead || !other.TryGetComponent(out PlayerController player))
            {
                return;
            }

            player.RemoveSquad(contactSquadDamage);
            Die();
        }
    }
}
