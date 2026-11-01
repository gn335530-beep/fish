/* 語音輸入：使用瀏覽器 Web Speech API，單次辨識並附加到輸入框。 */

export function initVoice(options) {
  const settings = options || {};
  const button = settings.button;
  const input = settings.input;
  const onError = settings.onError || function () {};
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function setListening(value) {
    button.setAttribute("aria-pressed", String(value));
  }

  if (!Recognition) {
    button.addEventListener("click", function () {
      onError("這個瀏覽器不支援語音輸入");
    });
    return { supported: false };
  }

  const recognition = new Recognition();
  recognition.lang = "zh-TW";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  let listening = false;

  function reset() {
    listening = false;
    setListening(false);
  }

  recognition.onresult = function (event) {
    const result = event.results && event.results[0] && event.results[0][0];
    const text = result ? String(result.transcript || "").trim() : "";
    if (!text) return;
    const limit = Number(input.maxLength) > 0 ? Number(input.maxLength) : 500;
    input.value = (input.value + text).trim().slice(0, limit);
  };
  recognition.onerror = function (event) {
    reset();
    if (event && (event.error === "not-allowed" || event.error === "service-not-allowed")) {
      onError("麥克風權限被拒絕，請允許後再試");
    } else if (event && event.error !== "aborted" && event.error !== "no-speech") {
      onError("語音輸入失敗，請再試一次");
    }
  };
  recognition.onend = function () {
    reset();
  };

  button.addEventListener("click", function () {
    if (listening) {
      reset();
      recognition.stop();
      return;
    }
    try {
      recognition.start();
      listening = true;
      setListening(true);
      input.focus();
    } catch (error) {
      reset();
      onError("無法啟動語音輸入，請再試一次");
    }
  });

  return { supported: true };
}
