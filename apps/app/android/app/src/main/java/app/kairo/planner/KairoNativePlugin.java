package app.kairo.planner;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONException;

/**
 * Module natif de Kairo (interface `platform`, côté Android) : voix des rappels et minuteur de
 * focus hors de l'app. La version web est dans packages/platform/src/voice.ts.
 */
@CapacitorPlugin(name = "KairoNative")
public class KairoNativePlugin extends Plugin {
    private static final String FOCUS_CHANNEL = "kairo_focus";
    private static final int FOCUS_ID = 0x4B414952;

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        String lang = call.getString("lang", "fr-FR");
        if (text == null || text.isEmpty()) {
            call.resolve();
            return;
        }
        Speaker.say(getContext(), text, lang, call::resolve);
    }

    @PluginMethod
    public void scheduleVoice(PluginCall call) {
        JSArray items = call.getArray("items", new JSArray());
        String lang = call.getString("lang", "fr-FR");
        try {
            VoiceAlarms.replace(getContext(), new JSONArray(items.toString()), lang);
            call.resolve();
        } catch (JSONException e) {
            call.reject("Liste d'annonces invalide", e);
        }
    }

    @PluginMethod
    public void showFocus(PluginCall call) {
        Context ctx = getContext();
        NotificationManagerCompat nm = NotificationManagerCompat.from(ctx);
        if (!nm.areNotificationsEnabled()) {
            call.resolve();
            return;
        }
        ensureChannel(ctx);
        Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        PendingIntent open = launch == null ? null : PendingIntent.getActivity(
            ctx, 0, launch.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, FOCUS_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_kairo)
            .setColor(0xFFB4A5FF)
            .setContentTitle(call.getString("title", "Focus"))
            .setContentText(call.getString("text", ""))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(open);
        Long endAt = call.getLong("endAt");
        long now = System.currentTimeMillis();
        if (endAt != null && endAt > now) {
            // Compte à rebours tenu par le système : il avance même app fermée.
            b.setWhen(endAt)
                .setShowWhen(true)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setTimeoutAfter(endAt - now + 60_000);
        } else {
            b.setShowWhen(false);
        }
        try {
            nm.notify(FOCUS_ID, b.build());
        } catch (SecurityException e) {
            // Autorisation retirée entre-temps : rien à afficher.
        }
        call.resolve();
    }

    @PluginMethod
    public void hideFocus(PluginCall call) {
        NotificationManagerCompat.from(getContext()).cancel(FOCUS_ID);
        call.resolve();
    }

    private static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(FOCUS_CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(
            FOCUS_CHANNEL, ctx.getString(R.string.focus_channel), NotificationManager.IMPORTANCE_LOW);
        ch.setDescription(ctx.getString(R.string.focus_channel_desc));
        ch.setShowBadge(false);
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }
}
