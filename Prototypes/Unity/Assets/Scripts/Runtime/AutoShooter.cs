using UnityEngine;

namespace WrongWorld.AbsurdRunner
{
    public sealed class AutoShooter : MonoBehaviour
    {
        [SerializeField] private PlayerController player;
        [SerializeField] private Projectile projectilePrefab;
        [SerializeField] private Transform firePoint;
        [SerializeField] private float baseDamage = 5f;
        [SerializeField] private float shotsPerSecond = 3f;
        [SerializeField] private float projectileSpeed = 12f;

        private float cooldown;

        private void Awake()
        {
            if (player == null)
            {
                player = GetComponent<PlayerController>();
            }
        }

        private void Update()
        {
            if (player == null || projectilePrefab == null || firePoint == null || player.SquadCount <= 0)
            {
                return;
            }

            cooldown -= Time.deltaTime;
            float effectiveRate = Mathf.Max(0.1f, shotsPerSecond * player.FireRateMultiplier);
            if (cooldown > 0f)
            {
                return;
            }

            Shoot();
            cooldown = 1f / effectiveRate;
        }

        private void Shoot()
        {
            Projectile projectile = Instantiate(projectilePrefab, firePoint.position, firePoint.rotation);
            float squadScale = Mathf.Max(1f, Mathf.Sqrt(player.SquadCount));
            float damage = baseDamage * player.DamageMultiplier * squadScale;
            projectile.Launch(Vector3.forward, projectileSpeed, damage, gameObject);
        }
    }
}
