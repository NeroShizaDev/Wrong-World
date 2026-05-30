using UnityEngine;

namespace WrongWorld.AbsurdRunner
{
    public interface IDamageable
    {
        void TakeDamage(float amount, GameObject source);
    }
}
