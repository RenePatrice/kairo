package app.kairo.planner;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Module natif de Kairo : voix des rappels et minuteur de focus hors de l'app.
        registerPlugin(KairoNativePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
