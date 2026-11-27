package app.kairo.planner;

import android.content.Context;
import android.media.AudioAttributes;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Lit une phrase avec la voix de synthèse d'Android. Le son suit le volume des notifications :
 * muet en mode silencieux ou « Ne pas déranger ».
 */
final class Speaker {
    /** Au-delà, on coupe : un récepteur d'alarme ne doit pas rester bloqué. */
    private static final long MAX_MS = 20_000;

    private Speaker() {}

    static void say(Context context, String text, String lang, Runnable done) {
        final Handler main = new Handler(Looper.getMainLooper());
        final TextToSpeech[] holder = new TextToSpeech[1];
        final AtomicBoolean finished = new AtomicBoolean(false);
        final Runnable finish = () -> {
            if (!finished.compareAndSet(false, true)) return;
            TextToSpeech tts = holder[0];
            if (tts != null) {
                tts.stop();
                tts.shutdown();
            }
            if (done != null) done.run();
        };
        main.postDelayed(finish, MAX_MS);
        holder[0] = new TextToSpeech(context.getApplicationContext(), status -> {
            TextToSpeech tts = holder[0];
            if (status != TextToSpeech.SUCCESS || tts == null) {
                main.post(finish);
                return;
            }
            int ok = tts.setLanguage(Locale.forLanguageTag(lang));
            if (ok == TextToSpeech.LANG_MISSING_DATA || ok == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts.setLanguage(Locale.getDefault());
            }
            tts.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build());
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) {}
                @Override public void onDone(String id) { main.post(finish); }
                @Override public void onError(String id) { main.post(finish); }
            });
            if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "kairo") != TextToSpeech.SUCCESS) {
                main.post(finish);
            }
        });
    }
}
