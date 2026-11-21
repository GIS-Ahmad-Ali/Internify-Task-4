document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'geopulse_last_3_searches';

  const searchForm = document.getElementById('searchForm');
  const cityInput = document.getElementById('cityInput');
  const searchBtn = document.getElementById('searchBtn');

  const recentBar = document.getElementById('recentBar');
  const recentChips = document.getElementById('recentChips');

  const loadingSpinner = document.getElementById('loadingSpinner');
  const errorBox = document.getElementById('errorBox');
  const errorTitle = document.getElementById('errorTitle');
  const errorText = document.getElementById('errorText');

  const weatherCard = document.getElementById('weatherCard');
  const cityNameEl = document.getElementById('cityName');
  const regionNameEl = document.getElementById('regionName');
  const elevationTagEl = document.getElementById('elevationTag');
  const weatherEmojiEl = document.getElementById('weatherEmoji');
  const weatherDescEl = document.getElementById('weatherDesc');
  const tempValueEl = document.getElementById('tempValue');
  const feelsLikeValueEl = document.getElementById('feelsLikeValue');
  const timezoneTagEl = document.getElementById('timezoneTag');
  const humidityValueEl = document.getElementById('humidityValue');
  const windValueEl = document.getElementById('windValue');
  const pressureValueEl = document.getElementById('pressureValue');
  const precipValueEl = document.getElementById('precipValue');

  /* ============================================================
     1. LIVE WEATHER-REACTIVE ATMOSPHERIC CANVAS ENGINE
        - Wind streamlines scaled by real wind_speed_10m
        - Sun rays (Clear), Cloud wisps (Cloudy/Fog),
          Rain streaks + lightning (Rain/Storm), Snowflakes (Snow)
     ============================================================ */
  const canvas = document.getElementById('weatherBackdropCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let width = 0;
  let height = 0;

  const weatherState = {
    condition: 'clear', // 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm'
    windSpeed: 10,
    temp: 24,
    flashAlpha: 0
  };

  function classifyCondition(code) {
    if (code === 0 || code === 1) return 'clear';
    if (code === 2 || code === 3 || code === 45 || code === 48) return 'cloudy';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 95) return 'storm';
    return 'rain';
  }

  function updateWeatherAtmosphere(weatherCode, windSpeedKmh, tempC) {
    const cond = classifyCondition(weatherCode);
    weatherState.condition = cond;
    weatherState.windSpeed = Math.max(2, Number(windSpeedKmh) || 10);
    weatherState.temp = Number(tempC) || 22;

    document.body.classList.remove(
      'weather-clear',
      'weather-cloudy',
      'weather-rain',
      'weather-snow',
      'weather-storm'
    );
    document.body.classList.add(`weather-${cond}`);
  }

  if (canvas && ctx) {
    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Wind Streamlines Pool
    const windLines = Array.from({ length: 16 }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: ((i + 0.5) / 16) * window.innerHeight,
      length: 110 + Math.random() * 140,
      amp: 8 + Math.random() * 14,
      freq: 0.012 + Math.random() * 0.008,
      phase: Math.random() * Math.PI * 2,
      speedFactor: 0.75 + Math.random() * 0.55
    }));

    // Precipitation Particles (Raindrops & Snowflakes)
    const precipParticles = Array.from({ length: 75 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      len: 12 + Math.random() * 14,
      radius: 2 + Math.random() * 2.5,
      speedY: 4 + Math.random() * 4,
      swayOffset: Math.random() * Math.PI * 2
    }));

    // Soft Cloud Wisps
    const cloudWisps = Array.from({ length: 6 }, (_, i) => ({
      x: (i / 6) * window.innerWidth,
      y: 70 + (i % 3) * 140,
      rx: 130 + Math.random() * 80,
      ry: 38 + Math.random() * 20,
      speed: 0.18 + Math.random() * 0.15
    }));

    let animTick = 0;

    function renderAtmosphere() {
      ctx.clearRect(0, 0, width, height);
      animTick += 0.02;

      const windMultiplier = Math.min(3.4, Math.max(0.45, weatherState.windSpeed / 12));
      const cond = weatherState.condition;

      // 1. CLEAR / SUNNY: Soft Warm Sunbeams in Upper Right
      if (cond === 'clear') {
        const sunX = width * 0.88;
        const sunY = height * 0.10;
        ctx.save();
        for (let r = 0; r < 7; r++) {
          const rayAngle = Math.PI * 0.62 + r * 0.14 + Math.sin(animTick * 0.4 + r) * 0.02;
          const rayLen = Math.max(width, height) * 0.85;
          const grad = ctx.createLinearGradient(
            sunX,
            sunY,
            sunX + Math.cos(rayAngle) * rayLen,
            sunY + Math.sin(rayAngle) * rayLen
          );
          grad.addColorStop(0, 'rgba(234, 152, 42, 0.14)');
          grad.addColorStop(1, 'rgba(234, 152, 42, 0.0)');

          ctx.beginPath();
          ctx.moveTo(sunX, sunY);
          ctx.lineTo(
            sunX + Math.cos(rayAngle - 0.035) * rayLen,
            sunY + Math.sin(rayAngle - 0.035) * rayLen
          );
          ctx.lineTo(
            sunX + Math.cos(rayAngle + 0.035) * rayLen,
            sunY + Math.sin(rayAngle + 0.035) * rayLen
          );
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
        }
        ctx.restore();
      }

      // 2. CLOUDY / FOG: Drifting Atmospheric Mist Bands
      if (cond === 'cloudy' || cond === 'rain' || cond === 'storm') {
        ctx.save();
        cloudWisps.forEach((wisp) => {
          wisp.x += wisp.speed * windMultiplier;
          if (wisp.x - wisp.rx > width) wisp.x = -wisp.rx;

          const grad = ctx.createRadialGradient(wisp.x, wisp.y, 10, wisp.x, wisp.y, wisp.rx);
          grad.addColorStop(0, 'rgba(100, 116, 139, 0.13)');
          grad.addColorStop(1, 'rgba(100, 116, 139, 0.0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(wisp.x, wisp.y, wisp.rx, wisp.ry, 0, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // 3. LIVE WIND STREAMLINES (Always active, speed & color matched to weather)
      ctx.save();
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';

      let strokeRGB = '22, 43, 77';
      if (cond === 'clear') strokeRGB = '200, 90, 50';
      if (cond === 'rain' || cond === 'storm') strokeRGB = '37, 99, 235';
      if (cond === 'snow') strokeRGB = '14, 116, 144';

      windLines.forEach((line) => {
        line.x += 1.55 * windMultiplier * line.speedFactor;
        line.phase += 0.035 * windMultiplier;

        if (line.x - line.length > width) {
          line.x = -line.length;
        }

        const lineGrad = ctx.createLinearGradient(line.x, line.y, line.x + line.length, line.y);
        lineGrad.addColorStop(0, `rgba(${strokeRGB}, 0)`);
        lineGrad.addColorStop(0.5, `rgba(${strokeRGB}, 0.24)`);
        lineGrad.addColorStop(1, `rgba(${strokeRGB}, 0)`);

        ctx.strokeStyle = lineGrad;
        ctx.beginPath();
        for (let dx = 0; dx <= line.length; dx += 12) {
          const px = line.x + dx;
          const py = line.y + Math.sin(dx * line.freq + line.phase) * line.amp;
          if (dx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      });
      ctx.restore();

      // 4. RAIN / THUNDERSTORM STREAKS
      if (cond === 'rain' || cond === 'storm') {
        ctx.save();
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.28)';
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';

        const windSlant = 1.8 * windMultiplier;

        precipParticles.forEach((drop) => {
          drop.x += windSlant;
          drop.y += drop.speedY * 1.45;

          if (drop.y > height) {
            drop.y = -20;
            drop.x = Math.random() * width;
          }
          if (drop.x > width) drop.x = 0;

          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x + windSlant * 1.6, drop.y + drop.len);
          ctx.stroke();
        });
        ctx.restore();

        // Subtle lightning pulse during thunderstorms
        if (cond === 'storm') {
          if (Math.random() < 0.006 && weatherState.flashAlpha <= 0.02) {
            weatherState.flashAlpha = 0.22;
          }
          if (weatherState.flashAlpha > 0) {
            ctx.fillStyle = `rgba(147, 197, 253, ${weatherState.flashAlpha})`;
            ctx.fillRect(0, 0, width, height);
            weatherState.flashAlpha *= 0.86;
          }
        }
      }

      // 5. SNOWFLAKES
      if (cond === 'snow') {
        ctx.save();
        ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
        precipParticles.forEach((flake) => {
          flake.y += flake.speedY * 0.38;
          flake.x += Math.sin(animTick + flake.swayOffset) * 0.8 + windMultiplier * 0.45;

          if (flake.y > height) {
            flake.y = -10;
            flake.x = Math.random() * width;
          }
          if (flake.x > width) flake.x = 0;

          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      requestAnimationFrame(renderAtmosphere);
    }

    renderAtmosphere();
  }

  /* ============================================================
     2. WMO WEATHER CODE TO LABEL & ICON MAPPER
     ============================================================ */
  function decodeWeatherCode(code) {
    const map = {
      0: { label: 'Clear Sky', icon: '☀️' },
      1: { label: 'Mainly Clear', icon: '🌤️' },
      2: { label: 'Partly Cloudy', icon: '⛅' },
      3: { label: 'Overcast', icon: '☁️' },
      45: { label: 'Foggy', icon: '🌫️' },
      48: { label: 'Rime Fog', icon: '🌫️' },
      51: { label: 'Light Drizzle', icon: '🌦️' },
      53: { label: 'Moderate Drizzle', icon: '🌦️' },
      55: { label: 'Dense Drizzle', icon: '🌧️' },
      61: { label: 'Slight Rain', icon: '🌧️' },
      63: { label: 'Moderate Rain', icon: '🌧️' },
      65: { label: 'Heavy Rain', icon: '⛈️' },
      71: { label: 'Slight Snow', icon: '🌨️' },
      73: { label: 'Moderate Snow', icon: '❄️' },
      75: { label: 'Heavy Snow', icon: '❄️' },
      80: { label: 'Rain Showers', icon: '🌦️' },
      81: { label: 'Heavy Showers', icon: '🌧️' },
      95: { label: 'Thunderstorm', icon: '⛈️' }
    };
    return map[code] || { label: 'Atmospheric Stable', icon: '🌍' };
  }

  /* ============================================================
     3. LOCAL STORAGE: SAVE & RENDER LAST 3 SEARCHES
     ============================================================ */
  function getSavedSearches() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch {
      return [];
    }
  }

  function saveSearchTerm(cityLabel) {
    const existing = getSavedSearches();
    const filtered = existing.filter(
      (item) => item.toLowerCase() !== cityLabel.toLowerCase()
    );
    const updated = [cityLabel, ...filtered].slice(0, 3);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    renderRecentChips();
  }

  function renderRecentChips() {
    const searches = getSavedSearches();
    recentChips.innerHTML = '';

    if (searches.length === 0) {
      recentBar.hidden = true;
      return;
    }

    recentBar.hidden = false;
    searches.forEach((city) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'recent-chip';
      btn.textContent = city;
      btn.addEventListener('click', () => {
        cityInput.value = city;
        fetchCityWeather(city, true);
      });
      recentChips.appendChild(btn);
    });
  }

  /* ============================================================
     4. UI STATE HELPERS (LOADING, ERROR, ANIMATED CARD)
     ============================================================ */
  function showLoading() {
    loadingSpinner.hidden = false;
    errorBox.hidden = true;
    weatherCard.hidden = true;
    searchBtn.disabled = true;
  }

  function showError(title, message) {
    loadingSpinner.hidden = true;
    weatherCard.hidden = true;
    errorTitle.textContent = title;
    errorText.textContent = message;
    errorBox.hidden = false;
    searchBtn.disabled = false;
  }

  function displayWeatherCard(place, forecastData) {
    const current = forecastData.current;
    const weatherMeta = decodeWeatherCode(current.weather_code);

    const regionParts = [place.admin1, place.country].filter(Boolean);
    cityNameEl.textContent = place.name;
    regionNameEl.textContent = regionParts.join(', ') || 'Global Observation Station';

    const elev = typeof place.elevation === 'number' ? Math.round(place.elevation) : 'N/A';
    elevationTagEl.textContent = `Elevation: ${elev} m ASL`;

    weatherEmojiEl.textContent = weatherMeta.icon;
    weatherDescEl.textContent = weatherMeta.label;

    tempValueEl.textContent = Math.round(current.temperature_2m);
    feelsLikeValueEl.textContent = `${Math.round(current.apparent_temperature)}°C`;
    timezoneTagEl.textContent = `Timezone: ${forecastData.timezone || 'UTC'}`;

    humidityValueEl.textContent = `${current.relative_humidity_2m}%`;
    windValueEl.textContent = `${current.wind_speed_10m} km/h`;
    pressureValueEl.textContent = `${Math.round(current.surface_pressure)} hPa`;
    precipValueEl.textContent = `${current.precipitation} mm`;

    // Sync background lines & weather effects with live API response
    updateWeatherAtmosphere(
      current.weather_code,
      current.wind_speed_10m,
      current.temperature_2m
    );

    loadingSpinner.hidden = true;
    errorBox.hidden = true;
    weatherCard.hidden = false;
    searchBtn.disabled = false;

    weatherCard.classList.remove('animate-in');
    void weatherCard.offsetWidth;
    weatherCard.classList.add('animate-in');
  }

  /* ============================================================
     5. LIVE API FETCH (ASYNC / AWAIT)
     ============================================================ */
  async function fetchCityWeather(query, shouldSave = true) {
    const trimmed = query.trim();
    if (!trimmed) {
      showError('Empty search query', 'Please type a city name before searching.');
      return;
    }

    showLoading();

    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=en&format=json`;
      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) {
        throw new Error('Geocoding service unavailable.');
      }

      const geoJson = await geoRes.json();
      if (!geoJson.results || geoJson.results.length === 0) {
        showError('City not found', `No matching location found for "${trimmed}". Try another city name.`);
        return;
      }

      const place = geoJson.results[0];

      const weatherUrl =
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m&timezone=auto`;

      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) {
        throw new Error('Weather telemetry service unavailable.');
      }

      const weatherJson = await weatherRes.json();

      displayWeatherCard(place, weatherJson);

      if (shouldSave) {
        saveSearchTerm(place.name);
      }
    } catch (err) {
      showError('Unable to fetch live data', 'Please check your internet connection and try again.');
    }
  }

  /* ============================================================
     6. FORM SUBMIT & INITIAL LOAD
     ============================================================ */
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    fetchCityWeather(cityInput.value, true);
  });

  renderRecentChips();

  const saved = getSavedSearches();
  if (saved.length > 0) {
    cityInput.value = saved[0];
    fetchCityWeather(saved[0], false);
  } else {
    fetchCityWeather('Lahore', false);
  }
});