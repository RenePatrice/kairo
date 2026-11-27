package app.kairo.planner;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;

/** Heure d'une annonce : la voix lit le rappel (« Sport dans 10 minutes »). */
public class VoiceReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!VoiceAlarms.ACTION.equals(intent.getAction())) return;
        final String text = intent.getStringExtra("text");
        if (text == null || text.isEmpty()) return;
        final String lang = intent.getStringExtra("lang");
        final PendingResult pending = goAsync();
        // Laisse d'abord passer le son de la notification du même rappel.
        new Handler(Looper.getMainLooper()).postDelayed(
            () -> Speaker.say(context, text, lang == null ? "fr-FR" : lang, pending::finish),
            1200);
    }
}
