// Where booking requests are sent. Change this to the real bookings inbox.
const BOOKING_EMAIL = "bookings@sheilahgashumba.com";
// Paste a Formspree (or similar) form URL here, e.g. "https://formspree.io/f/abcdwxyz",
// to send requests straight to the inbox. Left empty, the visitor's email app opens instead.
const FORM_ENDPOINT = "";
// WhatsApp number in international format, digits only, e.g. "256772123456".
// Left empty, the WhatsApp buttons stay hidden.
const WHATSAPP_NUMBER = "";

// Mobile menu
const toggle = document.querySelector(".nav__toggle");
const links = document.getElementById("nav-links");

toggle.addEventListener("click", () => {
  const open = links.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", open);
  toggle.textContent = open ? "Close" : "Menu";
});

links.addEventListener("click", (e) => {
  if (e.target.tagName === "A" && links.classList.contains("is-open")) toggle.click();
});

// Record: tap to drop the needle and spin.
// On the home page it also plays the Stunner's Society mix in a small YouTube player
// (YouTube's terms require the player to stay visible while it plays).
const MIX_VIDEO_ID = "eOtVqlQegaQ";
const record = document.getElementById("record");
const hint = document.getElementById("deck-hint");
const mini = document.getElementById("mini-player");

const setSpin = (on) => {
  record.classList.toggle("is-spinning", on);
  record.closest(".deck").classList.toggle("is-playing", on);
  record.setAttribute("aria-pressed", on);
  record.setAttribute("aria-label", on ? "Pause the mix" : "Play the mix");
  hint.textContent = on ? "Tap the record to pause" : "Tap the record to play her mix";
};

if (record && mini) {
  let player = null;
  let ready = false;
  let wantPlay = false;
  let blockedTimer;

  // Load YouTube's player code only when someone reaches for the record
  const loadApi = () => {
    if (document.getElementById("yt-api")) return;
    const script = document.createElement("script");
    script.id = "yt-api";
    script.src = "https://www.youtube.com/iframe_api";
    document.head.append(script);
  };
  ["pointerenter", "touchstart", "focus"].forEach((ev) =>
    record.addEventListener(ev, loadApi, { once: true, passive: true }));

  // If the browser blocks sound until the player itself is tapped, say so
  const watchForBlock = () => {
    clearTimeout(blockedTimer);
    blockedTimer = setTimeout(() => {
      if (player && player.getPlayerState() !== YT.PlayerState.PLAYING) {
        setSpin(false);
        hint.textContent = "Press play on the video to start the mix";
      }
    }, 3000);
  };

  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player("yt-player", {
      host: "https://www.youtube-nocookie.com",
      videoId: MIX_VIDEO_ID,
      width: "100%",
      height: "100%",
      playerVars: { playsinline: 1, rel: 0 },
      events: {
        onReady: () => {
          ready = true;
          if (wantPlay) { player.playVideo(); watchForBlock(); }
        },
        onStateChange: (e) => {
          const on = e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING;
          if (on) clearTimeout(blockedTimer);
          setSpin(on);
        },
      },
    });
  };

  record.addEventListener("click", () => {
    mini.hidden = false;
    if (!ready) {
      wantPlay = true;
      setSpin(true);
      loadApi();
      return;
    }
    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    } else {
      player.playVideo();
      watchForBlock();
    }
  });

  mini.querySelector(".mini-player__close").addEventListener("click", () => {
    wantPlay = false;
    if (ready) player.stopVideo();
    mini.hidden = true;
    setSpin(false);
  });
} else if (record) {
  record.addEventListener("click", () => setSpin(!record.classList.contains("is-spinning")));
}

// Booking form: validate, then open the visitor's email app with the details filled in
const form = document.getElementById("booking-form");
const errorBox = document.getElementById("form-error");
const doneBox = document.getElementById("form-done");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  doneBox.hidden = true;

  const missing = [];
  form.querySelectorAll("[required]").forEach((field) => {
    const valid = field.value.trim() !== "" && field.checkValidity();
    field.setAttribute("aria-invalid", !valid);
    if (!valid) missing.push(form.querySelector(`label[for="${field.id}"]`).textContent);
  });

  if (missing.length) {
    errorBox.textContent = `Please fill in: ${missing.join(", ")}.`;
    errorBox.hidden = false;
    form.querySelector('[aria-invalid="true"]').focus();
    return;
  }
  errorBox.hidden = true;

  const data = Object.fromEntries(new FormData(form));

  if (FORM_ENDPOINT) {
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      doneBox.textContent = "Booking request sent. The team will reply by email.";
      doneBox.hidden = false;
    } catch {
      errorBox.textContent = `Your request couldn’t be sent. Please email ${BOOKING_EMAIL} instead.`;
      errorBox.hidden = false;
    } finally {
      submit.disabled = false;
    }
    return;
  }

  const subject = `Booking request: ${data.type} – ${data.name}`;
  const body = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Booking: ${data.type}`,
    `Date: ${data.date || "Not set"}`,
    `City: ${data.city || "Not set"}`,
    "",
    data.message,
  ].join("\n");

  window.location.href = `mailto:${BOOKING_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  doneBox.hidden = false;
});

// /book/?type=foundation (etc.) opens the form with that booking type chosen
const BOOKING_TYPES = {
  dj: "DJ set",
  hosting: "Hosting or MC",
  brand: "Brand partnership",
  media: "Media appearance or interview",
  foundation: "Foundation partnership or donation",
};
const presetType = BOOKING_TYPES[new URLSearchParams(location.search).get("type")];
if (form && presetType) form.elements.type.value = presetType;

// Gallery: role filters (also read from ?role=) and a full-screen photo viewer
const grid = document.querySelector(".gallery__grid");

if (grid) {
  const filters = [...document.querySelectorAll(".filter")];
  const tiles = [...grid.querySelectorAll(".tile")];

  const showRole = (role) => {
    filters.forEach((b) => b.setAttribute("aria-pressed", b.dataset.filter === role));
    tiles.forEach((t) => { t.hidden = role !== "all" && t.dataset.role !== role; });
    grid.classList.toggle("is-filtered", role !== "all");
  };

  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      const role = btn.dataset.filter;
      showRole(role);
      const url = new URL(location.href);
      if (role === "all") url.searchParams.delete("role");
      else url.searchParams.set("role", role);
      history.replaceState(null, "", url);
    });
  });

  const startRole = new URLSearchParams(location.search).get("role");
  if (filters.some((b) => b.dataset.filter === startRole)) showRole(startRole);

  const viewer = document.getElementById("lightbox");
  const viewerImg = viewer.querySelector(".lightbox__img");
  const caption = viewer.querySelector(".lightbox__caption");
  const count = viewer.querySelector(".lightbox__count");
  let index = 0;

  const visible = () => tiles.filter((t) => !t.hidden);

  const show = (i) => {
    const list = visible();
    index = (i + list.length) % list.length;
    const img = list[index].querySelector("img");
    viewerImg.src = img.currentSrc || img.src;
    viewerImg.alt = img.alt;
    caption.textContent = img.alt;
    count.textContent = `${index + 1} of ${list.length}`;
  };

  tiles.forEach((tile) => {
    tile.querySelector(".tile__open").addEventListener("click", () => {
      show(visible().indexOf(tile));
      viewer.showModal();
    });
  });

  viewer.querySelector('[data-lb="prev"]').addEventListener("click", () => show(index - 1));
  viewer.querySelector('[data-lb="next"]').addEventListener("click", () => show(index + 1));
  viewer.querySelector('[data-lb="close"]').addEventListener("click", () => viewer.close());

  viewer.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(index - 1);
    if (e.key === "ArrowRight") show(index + 1);
  });

  // Click on the dark backdrop closes; swipe left/right changes photo
  viewer.addEventListener("click", (e) => { if (e.target === viewer) viewer.close(); });
  let touchX = null;
  viewer.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  viewer.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });
}

// WhatsApp buttons appear once a number is set
if (WHATSAPP_NUMBER) {
  const text = encodeURIComponent("Hi, I’d like to book Sheilah Gashumba for an event.");
  document.querySelectorAll("[data-whatsapp]").forEach((link) => {
    link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
    link.hidden = false;
  });
}

document.getElementById("year").textContent = new Date().getFullYear();
