/* ============================================================
   القرآن بالأوامر الصوتية — منطق التطبيق
   لا يعتمد على أي مكتبة خارجية. يعمل مباشرة في المتصفح.
   التحكّم يتم كلياً عبر الأوامر الصوتية (Web Speech API).
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- عناصر الواجهة ---------------- */
  var audio        = document.getElementById('quran-audio');
  var btnVoice     = document.getElementById('btn-voice');

  var playStatus   = document.getElementById('play-status');
  var progressBar  = document.getElementById('progress-bar');
  var progressFill = document.getElementById('progress-fill');
  var timeStatus   = document.getElementById('time-status');
  var voiceStatus  = document.getElementById('voice-status');
  var voiceResult  = document.getElementById('voice-result');
  var voiceSupport = document.getElementById('voice-support');
  var announcer    = document.getElementById('sr-announcer');

  /* ---------------- أدوات مساعدة ---------------- */

  /** يعلن نصاً لقارئ الشاشة دون تكرار نفس النص مرتين متتاليتين */
  function announce(text) {
    if (announcer.textContent === text) {
      announcer.textContent = text + ' '; // إجبار قارئ الشاشة على إعادة القراءة
    } else {
      announcer.textContent = text;
    }
  }

  function setPlayStatus(text) {
    playStatus.textContent = 'الحالة: ' + text;
  }

  /** يحوّل عدد الثواني إلى صيغة mm:ss */
  function fmtTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) { return '00:00'; }
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  /** يمتلئ شريط التقدّم ويحدّث نص الوقت مع مرور التشغيل */
  function updateProgress() {
    var dur = audio.duration;
    var cur = audio.currentTime;
    var pct = (isFinite(dur) && dur > 0) ? (cur / dur) * 100 : 0;

    progressFill.style.width = pct.toFixed(1) + '%';
    progressBar.setAttribute('aria-valuenow', Math.round(pct));
    progressBar.setAttribute('aria-valuetext', Math.round(pct) + ' بالمئة');

    var remaining = (isFinite(dur) && dur > 0) ? dur - cur : 0;
    timeStatus.textContent =
      'المنقضي: ' + fmtTime(cur) +
      ' — المتبقي: ' + fmtTime(remaining) +
      ' — المدة الكلية: ' + fmtTime(dur);
  }

  /* ---------------- التحكّم بالصوت ---------------- */

  function playFromStart(message) {
    audio.currentTime = 0;
    var p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function (err) {
        setPlayStatus('تعذّر التشغيل: ' + err.message);
        announce('تعذّر تشغيل الملف الصوتي');
      });
    }
    setPlayStatus('جارٍ التشغيل: سورة الفاتحة');
    announce(message || 'جارٍ تشغيل سورة الفاتحة');
  }

  function doPlay()   { playFromStart(); }
  function doRestart(){ playFromStart('إعادة التشغيل من البداية'); }

  function doPause() {
    if (audio.paused) { return; }
    audio.pause();
    setPlayStatus('متوقّف مؤقتاً');
    announce('تم الإيقاف المؤقت');
  }

  function doResume() {
    if (!audio.paused) { return; }
    var p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function (err) {
        setPlayStatus('تعذّر الاستئناف: ' + err.message);
      });
    }
    setPlayStatus('جارٍ التشغيل: سورة الفاتحة');
    announce('تم الاستئناف');
  }

  /* ---------------- أحداث عنصر الصوت ---------------- */

  audio.addEventListener('playing', function () {
    setPlayStatus('جارٍ التشغيل: سورة الفاتحة');
  });

  audio.addEventListener('pause', function () {
    if (!audio.ended) { setPlayStatus('متوقّف مؤقتاً'); }
  });

  audio.addEventListener('ended', function () {
    setPlayStatus('انتهى التشغيل');
    announce('انتهى تشغيل سورة الفاتحة');
  });

  audio.addEventListener('loadedmetadata', updateProgress);
  audio.addEventListener('timeupdate', updateProgress);

  // ملاحظة: لا نستخدم capture، لأن خطأ عنصر <source> الذي يسقط تلقائياً
  // إلى مصدر آخر لا يجب أن يُعتبر فشلاً. هذا المُستقبِل يعمل فقط حين
  // يفشل الملف الصوتي نفسه (أي فشلت كل المصادر).
  audio.addEventListener('error', function () {
    if (!audio.error) { return; } // لا خطأ حقيقي على الملف

    // يشرح الخطأ بلغة عربية مفهومة بدل رسالة المتصفح التقنية
    var msg = 'تعذّر تحميل ملف الصوت. تأكّد من وجود الملف audio/001.wav أو audio/001.mp3 بصيغة صحيحة.';
    var code = audio.error.code;

    if (code === 4) {                       // MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
      msg = 'الصيغة غير مدعومة أو الملف مفقود. ضع الملف باسم 001.wav أو 001.mp3 في مجلد audio.';
    } else if (code === 2) {                // MEDIA_ERR_NETWORK
      msg = 'خطأ في الشبكة أثناء تحميل الصوت. تحقّق من الاتصال أو أعد تشغيل الخادم المحلي.';
    } else if (code === 3) {                // MEDIA_ERR_DECODE
      msg = 'الملف الصوتي تالف أو ترميزه غير مفهوم. جرّب ملفاً آخر بصيغة WAV.';
    } else if (code === 1) {                // MEDIA_ERR_ABORTED
      msg = 'أُلغي تحميل ملف الصوت.';
    }

    setPlayStatus(msg);
    announce(msg);
  });

  /* ============================================================
     التعرّف على الأوامر الصوتية عبر Web Speech API
     ============================================================ */

  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = null;
  var listening = false;

  if (!SpeechRecognition) {
    btnVoice.disabled = true;
    voiceSupport.textContent =
      'متصفحك لا يدعم واجهة التعرّف على الكلام (Web Speech API). ' +
      'استخدم Google Chrome أو Microsoft Edge لتجربة الأوامر الصوتية.';
    announce('التحكّم الصوتي غير مدعوم في هذا المتصفح');
  } else {
    voiceSupport.textContent =
      'لأفضل نتيجة استخدم Chrome أو Edge، واسمح للموقع باستخدام الميكروفون. ' +
      'ملاحظة: خدمة التعرّف على الكلام تحتاج غالباً إلى اتصال بالإنترنت.';

    recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;

    recognition.onresult = function (event) {
      var interim = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        var res = event.results[i];
        var transcript = res[0].transcript.trim();

        if (res.isFinal) {
          handleVoiceCommand(transcript);
        } else {
          interim += transcript;
        }
      }
      voiceResult.textContent = interim ? 'سمعتُ: «' + interim + '»' : '';
    };

    recognition.onerror = function (event) {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        stopListening(true);
        voiceStatus.textContent = 'حالة الميكروفون: تم رفض الإذن';
        announce('لم يُسمح باستخدام الميكروفون. فعّل الإذن من إعدادات المتصفح.');
      } else if (event.error === 'no-speech') {
        voiceStatus.textContent = 'حالة الميكروفون: لم يُسمع صوت، جارٍ الانتظار…';
      } else if (event.error !== 'aborted') {
        voiceStatus.textContent = 'حالة الميكروفون: خطأ — ' + event.error;
      }
    };

    // بعض المتصفحات توقف الإصغاء تلقائياً؛ نعيد التشغيل ما دمنا نريد الاستماع
    recognition.onend = function () {
      if (listening) {
        try { recognition.start(); } catch (e) { /* تجاهل */ }
      }
    };
  }

  function startListening() {
    if (!recognition) { return; }
    listening = true;
    try { recognition.start(); } catch (e) { /* تجاهل */ }
    btnVoice.setAttribute('aria-pressed', 'true');
    btnVoice.textContent = '🎙️ إيقاف الإصغاء للأوامر الصوتية';
    voiceStatus.textContent = 'حالة الميكروفون: أستمع الآن… قل «الفاتحة»';
    voiceResult.textContent = '';
    announce('بدأ الإصغاء. قل: الفاتحة، أو إيقاف، أو استئناف، أو إعادة');
  }

  function stopListening(silent) {
    listening = false;
    if (recognition) {
      try { recognition.stop(); } catch (e) { /* تجاهل */ }
    }
    btnVoice.setAttribute('aria-pressed', 'false');
    btnVoice.textContent = '🎙️ بدء الإصغاء للأوامر الصوتية';
    voiceStatus.textContent = 'حالة الميكروفون: متوقّف';
    voiceResult.textContent = '';
    if (!silent) { announce('تم إيقاف الإصغاء'); }
  }

  btnVoice.addEventListener('click', function () {
    if (listening) { stopListening(); } else { startListening(); }
  });

  /* ---------------- تفسير الأوامر ---------------- */

  /** يوحّد النص العربي: يزيل التشكيل والتطويل ويوحّد الألف والهاء والتاء المربوطة
   *  ويحوّل الهمزات إلى حروفها الأصلية (ؤ→و، ئ→ي) كي تتطابق الكلمات */
  function normalize(text) {
    return text
      .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // تشكيل + تطويل
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/[ى]/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function handleVoiceCommand(raw) {
    var t = normalize(raw);
    if (!t) { return; }

    /* أثناء تشغيل الصوت نكتم بقية الأوامر عمداً.
       السبب: الميكروفون يلتقط صوت التلاوة الخارج من سماعة الهاتف، فتُنتج
       خدمة التعرّف نصاً يُقرأ كأنه أمر من المستخدم، فتتكرّر دورة
       التشغيل/الإيقاف ويقطع الصوت (تغذية راجعة صوتية).
       نسمح فقط بالإيقاف وإطفاء الميكروفون لأنهما لا تُعيدان إشعال الحلقة. */
    if (!audio.paused && !audio.ended) {
      if (/(ايقاف|توقف|وقف)/.test(t)) {
        doPause();       // تُحدِّث الحالة وتُعلن بنفسها
      } else if (/(اصمت|اكتم|ايقاف الاستماع|توقف عن الاستماع|اغلاق الميكروفون|اسكات)/.test(t)) {
        stopListening(); // تُحدِّث الحالة وتُعلن بنفسها
      } else {
        // نص ثابت (لا يتغيّر) حتى لا يُغرق قارئ الشاشة برسائل متغيّرة أثناء التلاوة
        voiceResult.textContent = 'سمعت جملة أثناء التشغيل — تجاهلها. المسموح فقط: إيقاف.';
      }
      return;
    }

    voiceResult.textContent = 'سمعتُ: «' + raw + '»';

    var matched = null;

    if (t.indexOf('الفاتحه') !== -1 || t.indexOf('فاتحه') !== -1 || t.indexOf('fatiha') !== -1) {
      matched = { label: 'تشغيل سورة الفاتحة', run: doPlay };
    } else if (/(اعاده|اعيد|من الاول|من البدايه|من جديد)/.test(t)) {
      matched = { label: 'إعادة التشغيل', run: doRestart };
    } else if (/(اصمت|اكتم|ايقاف الاستماع|توقف عن الاستماع|اغلاق الميكروفون|اسكات)/.test(t)) {
      matched = { label: 'إيقاف الإصغاء', run: function () { stopListening(); } };
    } else if (/(ايقاف|توقف|وقف)/.test(t)) {
      matched = { label: 'إيقاف مؤقت', run: doPause };
    } else if (/(استيناف|تابع|استمر|كمل)/.test(t)) {
      matched = { label: 'استئناف التشغيل', run: doResume };
    } else if (/(شغل|تشغيل)/.test(t)) {
      matched = { label: 'تشغيل', run: doPlay };
    }

    if (matched) {
      announce('أُمر مُعرَّف: ' + matched.label);
      matched.run();
    } else {
      announce('لم أفهم الأمر. جرّب قول: الفاتحة');
    }
  }

  /* ---------------- اختصار تشغيل/إيقاف الميكروفون ---------------- */

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) { return; }
    if (e.ctrlKey || e.altKey || e.metaKey) { return; }

    if (e.key.toLowerCase() === 'v') {
      e.preventDefault();
      btnVoice.click();
    }
  });

  /* ---------------- تهيئة ---------------- */
  setPlayStatus('جاهز للتشغيل');
  updateProgress();
})();
