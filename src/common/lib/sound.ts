// A simple click/pop sound encoded in base64 to avoid adding binary files
const NOTIFICATION_SOUND_B64 = "data:audio/mp3;base64,//MkxAA…(abbreviated, let's use a public URL for simplicity in the sandbox)";

export const playNotificationSound = () => {
    try {
        const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Audio play blocked by browser:", e));
    } catch (e) {
        console.error("Failed to play sound", e);
    }
};
