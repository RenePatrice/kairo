package app.kairo.planner;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Annonces vocales programmées avec AlarmManager : elles parlent à l'heure, même app fermée.
 * La liste est gardée pour être reprogrammée après un redémarrage du téléphone.
 */
final class VoiceAlarms {
    static final String ACTION = "app.kairo.planner.VOICE";
    private static final String PREFS = "kairo_voice";
    private static final String KEY_ITEMS = "items";
    private static final String KEY_LANG = "lang";

    private VoiceAlarms() {}

    /** Remplace toutes les annonces programmées. */
    static void replace(Context ctx, JSONArray items, String lang) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONArray old = read(prefs);
        for (int i = 0; i < old.length(); i++) {
            JSONObject o = old.optJSONObject(i);
            if (o != null) cancel(ctx, o.optInt("id"));
        }
        prefs.edit().putString(KEY_ITEMS, items.toString()).putString(KEY_LANG, lang).apply();
        scheduleAll(ctx, items, lang);
    }

    /** Après un redémarrage ou une mise à jour : reprogramme les annonces encore à venir. */
    static void restore(Context ctx) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        scheduleAll(ctx, read(prefs), prefs.getString(KEY_LANG, "fr-FR"));
    }

    private static void scheduleAll(Context ctx, JSONArray items, String lang) {
        long now = System.currentTimeMillis();
        for (int i = 0; i < items.length(); i++) {
            JSONObject o = items.optJSONObject(i);
            if (o == null) continue;
            long at = o.optLong("at");
            if (at <= now) continue;
            schedule(ctx, o.optInt("id"), at, o.optString("text"), lang);
        }
    }

    private static JSONArray read(SharedPreferences prefs) {
        try {
            return new JSONArray(prefs.getString(KEY_ITEMS, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    private static Intent intent(Context ctx) {
        return new Intent(ctx, VoiceReceiver.class).setAction(ACTION);
    }

    private static void schedule(Context ctx, int id, long at, String text, String lang) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent i = intent(ctx).putExtra("text", text).putExtra("lang", lang);
        PendingIntent pi = PendingIntent.getBroadcast(
            ctx, id, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        boolean exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms();
        if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
    }

    private static void cancel(Context ctx, int id) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = PendingIntent.getBroadcast(
            ctx, id, intent(ctx), PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (pi == null) return;
        if (am != null) am.cancel(pi);
        pi.cancel();
    }
}
