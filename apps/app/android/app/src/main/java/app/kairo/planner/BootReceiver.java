package app.kairo.planner;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Téléphone redémarré ou app mise à jour : les alarmes sont perdues, on reprogramme les annonces. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String a = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(a) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)) {
            VoiceAlarms.restore(context);
        }
    }
}
