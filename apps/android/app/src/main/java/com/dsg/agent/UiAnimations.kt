package com.dsg.agent

import android.animation.ObjectAnimator
import android.animation.PropertyValuesHolder
import android.view.View
import android.view.animation.DecelerateInterpolator

object UiAnimations {
    fun fadeInSlideUp(view: View, delayMs: Long = 0) {
        view.alpha = 0f
        view.translationY = view.context.resources.displayMetrics.density * 24
        view.animate()
            .alpha(1f)
            .translationY(0f)
            .setDuration(280)
            .setStartDelay(delayMs)
            .setInterpolator(DecelerateInterpolator())
            .start()
    }

    fun buttonPressScale(view: View) {
        view.animate()
            .scaleX(0.95f)
            .scaleY(0.95f)
            .setDuration(80)
            .withEndAction {
                view.animate()
                    .scaleX(1f)
                    .scaleY(1f)
                    .setDuration(120)
                    .start()
            }
            .start()
    }

    fun startTypingPulse(dots: List<View>): List<ObjectAnimator> = dots.mapIndexed { index, dot ->
        ObjectAnimator.ofPropertyValuesHolder(
            dot,
            PropertyValuesHolder.ofFloat(View.ALPHA, 0.2f, 1f, 0.2f),
        ).apply {
            duration = 900
            startDelay = index * 200L
            repeatCount = ObjectAnimator.INFINITE
            start()
        }
    }

    fun stopTypingPulse(animators: List<ObjectAnimator>) = animators.forEach { it.cancel() }
}
