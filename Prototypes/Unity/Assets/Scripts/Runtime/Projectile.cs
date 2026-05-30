using UnityEngine;

namespace WrongWorld.AbsurdRunner
{
    public sealed class Projectile : MonoBehaviour
    {
        [SerializeField] private float lifetime = 3f;

        private GameObject owner;
        private float damage;
        private float speed;
        private Vector3 direction = Vector3.forward;
        private float despawnAt;

        public void Launch(Vector3 launchDirection, float launchSpeed, float launchDamage, GameObject launchOwner)
        {
            direction = launchDirection.normalized;
            speed = launchSpeed;
            damage = launchDamage;
            owner = launchOwner;
            despawnAt = Time.time + lifetime;
        }

        private void Update()
        {
            transform.position += direction * speed * Time.deltaTime;

            if (Time.time >= despawnAt)
            {
                Destroy(gameObject);
            }
        }

        private void OnTriggerEnter(Collider other)
        {
            if (owner != null && other.gameObject == owner)
            {
                return;
            }

            if (!other.TryGetComponent(out IDamageable damageable))
            {
                return;
            }

            damageable.TakeDamage(damage, owner);
            Destroy(gameObject);
        }
    }
}
