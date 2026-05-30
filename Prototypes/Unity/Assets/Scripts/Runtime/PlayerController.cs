using System.Collections;
using UnityEngine;
using UnityEngine.Events;

namespace WrongWorld.AbsurdRunner
{
    [RequireComponent(typeof(Collider))]
    public sealed class PlayerController : MonoBehaviour
    {
        [Header("Movement")]
        [SerializeField] private Camera gameplayCamera;
        [SerializeField] private float horizontalLimit = 3.2f;
        [SerializeField] private float dragResponsiveness = 18f;
        [SerializeField] private float keyboardSpeed = 7f;

        [Header("Squad")]
        [SerializeField] private int startingSquadCount = 10;
        [SerializeField] private int maxSquadCount = 120;
        [SerializeField] private int squadCount = 10;

        [Header("Combat Multipliers")]
        [SerializeField] private float damageMultiplier = 1f;
        [SerializeField] private float fireRateMultiplier = 1f;
        [SerializeField] private bool shieldActive;

        public UnityEvent<int> SquadChanged;
        public UnityEvent Defeated;
        public UnityEvent ShieldChanged;

        public int SquadCount => squadCount;
        public float DamageMultiplier => damageMultiplier;
        public float FireRateMultiplier => fireRateMultiplier;
        public bool ShieldActive => shieldActive;

        private Coroutine damageBuffRoutine;
        private Coroutine fireRateBuffRoutine;
        private float targetX;

        private void Awake()
        {
            if (gameplayCamera == null)
            {
                gameplayCamera = Camera.main;
            }

            squadCount = Mathf.Clamp(startingSquadCount, 1, maxSquadCount);
            targetX = transform.position.x;
            SquadChanged?.Invoke(squadCount);
        }

        private void Update()
        {
            UpdateTargetFromPointer();
            UpdateTargetFromKeyboard();

            Vector3 current = transform.position;
            float nextX = Mathf.Lerp(current.x, targetX, 1f - Mathf.Exp(-dragResponsiveness * Time.deltaTime));
            transform.position = new Vector3(Mathf.Clamp(nextX, -horizontalLimit, horizontalLimit), current.y, current.z);
        }

        public void AddSquad(int amount)
        {
            SetSquadCount(squadCount + Mathf.Max(0, amount));
        }

        public void RemoveSquad(int amount)
        {
            if (amount <= 0)
            {
                return;
            }

            if (shieldActive)
            {
                shieldActive = false;
                ShieldChanged?.Invoke();
                return;
            }

            SetSquadCount(squadCount - amount);
        }

        public void ActivateShield()
        {
            shieldActive = true;
            ShieldChanged?.Invoke();
        }

        public void ApplyDamageMultiplier(float multiplier, float duration)
        {
            if (damageBuffRoutine != null)
            {
                StopCoroutine(damageBuffRoutine);
            }

            damageBuffRoutine = StartCoroutine(TemporaryMultiplier(
                value => damageMultiplier = value,
                multiplier,
                duration));
        }

        public void ApplyFireRateMultiplier(float multiplier, float duration)
        {
            if (fireRateBuffRoutine != null)
            {
                StopCoroutine(fireRateBuffRoutine);
            }

            fireRateBuffRoutine = StartCoroutine(TemporaryMultiplier(
                value => fireRateMultiplier = value,
                multiplier,
                duration));
        }

        private void SetSquadCount(int value)
        {
            squadCount = Mathf.Clamp(value, 0, maxSquadCount);
            SquadChanged?.Invoke(squadCount);

            if (squadCount <= 0)
            {
                Defeated?.Invoke();
            }
        }

        private void UpdateTargetFromPointer()
        {
            if (gameplayCamera == null)
            {
                return;
            }

            bool isPressed = Input.GetMouseButton(0);
            if (!isPressed)
            {
                return;
            }

            Ray ray = gameplayCamera.ScreenPointToRay(Input.mousePosition);
            Plane groundPlane = new Plane(Vector3.up, Vector3.zero);
            if (!groundPlane.Raycast(ray, out float enter))
            {
                return;
            }

            Vector3 worldPoint = ray.GetPoint(enter);
            targetX = Mathf.Clamp(worldPoint.x, -horizontalLimit, horizontalLimit);
        }

        private void UpdateTargetFromKeyboard()
        {
            float horizontal = Input.GetAxisRaw("Horizontal");
            if (Mathf.Approximately(horizontal, 0f))
            {
                return;
            }

            targetX = Mathf.Clamp(targetX + horizontal * keyboardSpeed * Time.deltaTime, -horizontalLimit, horizontalLimit);
        }

        private IEnumerator TemporaryMultiplier(System.Action<float> setter, float multiplier, float duration)
        {
            setter(Mathf.Max(0.1f, multiplier));
            yield return new WaitForSeconds(Mathf.Max(0.1f, duration));
            setter(1f);
        }
    }
}
