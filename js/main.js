/* ========================================
   Personal Portfolio — 蒙旭威
   Gallery, Video, Lightbox & Interactions
   ======================================== */

// --- Photo list (已删除最后三张微信图片) ---
const photoFiles = [
  '232-gigapixel-scale-0_50x.jpg', 'P1177213.jpg', 'P1177229.jpg',
  'P1177260.jpg', 'P1188775.jpg', 'P1188827.jpg', 'P11890117.jpg',
  'P1189129.jpg', 'P118919.JPG', 'P1189372.JPG.jpg', 'P1213397.jpg',
  'P1213431.jpg', 'P1213432.jpg', 'P1213482.jpg', 'P1213485.jpg',
  'P1214078.jpg', '000046350002.jpg', '000046350029.jpg',
  '000099310002.jpg', '000099310022.jpg'
];

// --- Video list (link 留空待补充) ---
// 有链接的排前面，无链接的排后面（点封面放大查看）
const videoList = [
  { cover: '《长沙草莓音乐节》.png',    title: '长沙草莓音乐节',          link: 'https://mp.weixin.qq.com/s/P6iRr9qp0noLcgQp2ihzXQ' },
  { cover: '长沙大学招生宣传片-《择材环 竞未来》.png', title: '长沙大学招生宣传片-择材环 竞未来', link: 'https://weixin.qq.com/sph/ARmlZzTZEY' },
  { cover: '湖南机电职院招生宣传片-《智汇未来信启程》.png', title: '招生宣传片-智汇未来信启程', link: 'https://www.douyin.com/user/MS4wLjABAAAAwe-gMw2irhvU8V3m0aOtQZSZA5RnTclj6RaeaOQs8Bk?from_tab_name=main&modal_id=7401832165249502516' },
  { cover: '学生剧组-《榕树里》.png',    title: '学生剧组-榕树里',         link: 'https://weixin.qq.com/sph/AB5bRXKfph' },
  { cover: '自制短视频-《宾得KX》.png',  title: '自制短视频-宾得KX',       link: 'https://www.bilibili.com/video/BV1UXVJzRErH/' },
  { cover: '旅拍婚礼-MV.jpg',         title: '旅拍婚礼 MV（可线下看片）',     link: '' },
  { cover: '广铁集团-长沙工务段视频.png', title: '广铁集团-长沙工务段视频（可线下看片）', link: '' },
  { cover: '湖南省楚怡杯一等奖视频模板.png', title: '湖南省楚怡杯一等奖视频模板（可线下看片）', link: '' },
];

// --- Poster design ---
const posterFiles = [
  '画板 1.jpg', '画板 2.jpg', '画板 3.jpg',
  '室内打卡.jpg', '室外摄影展.jpg'
];

// --- Album design ---
const albumFiles = [
  '《寨味·寨景》_画板 1.jpg',
  '《寨味·寨景》_画板 1 副本 2.jpg',
  '《寨味·寨景》_画板 1 副本 23.jpg',
  '《寨味·寨景》_画板 1 副本 3.jpg',
  '《寨味·寨景》_画板 1 副本 6.jpg',
  '《寨味·寨景》_画板 1 副本 7.jpg',
  '《寨这里》_画板 1 副本 2.jpg',
  '《寨这里》_画板 1 副本 3.jpg',
  '《寨这里》_画板 1 副本 4.jpg',
  '《寨这里》_画板 1 副本 5.jpg',
  '《寨这里》_画板 1 副本 6.jpg',
  '《寨这里》_画板 1 副本 7.jpg',
];

// --- Certificates ---
const certFiles = [
  'cert-1.jpg', 'cert-2.jpg', 'cert-3.jpg', 'cert-4.jpg',
  'cert-5.jpg', 'cert-6.jpg', 'cert-7.jpg',
];

// ==========================================

// --- Build Photo Gallery (缩略图显示，原图灯箱) ---
function buildPhotoGallery() {
  const container = document.getElementById('gallery-photo');
  if (!container) return;
  photoFiles.forEach(f => {
    const item = document.createElement('div');
    item.className = 'gallery-item reveal';
    item.dataset.fullSrc = 'assets/photos-new/' + f;
    const img = document.createElement('img');
    img.src = 'assets/thumbs/photos-new/' + f;
    img.alt = 'Photography';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.fetchPriority = 'low';
    item.appendChild(img);
    item.addEventListener('click', () => openLightbox(item.dataset.fullSrc));
    container.appendChild(item);
  });
}

// --- Build Design Gallery (缩略图显示，原图灯箱) ---
function buildDesignGallery(id, files, basePath, thumbPath) {
  const container = document.getElementById(id);
  if (!container) return;
  files.forEach(f => {
    const item = document.createElement('div');
    item.className = 'gallery-item reveal';
    item.dataset.fullSrc = basePath + f;
    const img = document.createElement('img');
    img.src = thumbPath + f;
    img.alt = 'Design';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.fetchPriority = 'low';
    item.appendChild(img);
    item.addEventListener('click', () => openLightbox(item.dataset.fullSrc));
    container.appendChild(item);
  });
}

// --- Build Video Grid ---
function buildVideoGrid() {
  const container = document.getElementById('video-grid');
  if (!container) return;
  videoList.forEach(v => {
    const card = document.createElement('div');
    card.className = 'video-card reveal';
    const fullSrc = 'assets/videos/' + v.cover;
    card.dataset.fullSrc = fullSrc;

    const wrap = document.createElement('div');
    wrap.className = 'video-cover-wrap';
    const img = document.createElement('img');
    img.src = 'assets/thumbs/videos/' + v.cover;
    img.alt = v.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.fetchPriority = 'low';

    const icon = document.createElement('div');
    icon.className = 'video-play-icon';
    icon.innerHTML = '&#9654;';

    wrap.appendChild(img);
    wrap.appendChild(icon);

    const title = document.createElement('p');
    title.className = 'video-title';
    title.textContent = v.title;

    card.appendChild(wrap);
    card.appendChild(title);

    // 有链接的视频加跳转标记
    if (v.link) {
      const tag = document.createElement('span');
      tag.className = 'video-link-tag';
      tag.textContent = '点击观看';
      card.appendChild(tag);
    }

    card.addEventListener('click', () => {
      if (v.link) {
        window.open(v.link, '_blank');
      } else {
        openLightbox(card.dataset.fullSrc);
      }
    });

    container.appendChild(card);
  });
}

// --- Build Cert Gallery ---
function buildCertGallery() {
  const container = document.getElementById('cert-gallery');
  if (!container) return;
  certFiles.forEach(f => {
    const item = document.createElement('div');
    item.className = 'cert-item reveal';
    item.dataset.fullSrc = 'assets/certs/' + f;
    const img = document.createElement('img');
    img.src = 'assets/thumbs/certs/' + f;
    img.alt = 'Certificate';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.fetchPriority = 'low';
    item.appendChild(img);
    item.addEventListener('click', () => openLightbox(item.dataset.fullSrc));
    container.appendChild(item);
  });
}

// --- Resume lightbox ---
function setupResume() {
  const wrap = document.querySelector('.resume-wrap');
  if (wrap) {
    wrap.dataset.fullSrc = 'assets/resume/个人简历.jpg';
    wrap.addEventListener('click', () => openLightbox(wrap.dataset.fullSrc));
  }
}

// ==========================================
// --- Lightbox (category-aware navigation) ---
let lightboxEl = null;
let currentGroup = [];
let currentIndex = -1;

function createLightbox() {
  if (lightboxEl) return;
  lightboxEl = document.createElement('div');
  lightboxEl.className = 'lightbox';
  lightboxEl.innerHTML = `
    <button class="lightbox-close" title="关闭 (Esc)">&times;</button>
    <button class="lightbox-prev" title="上一张 (←)">&lsaquo;</button>
    <img src="" alt="Preview">
    <button class="lightbox-next" title="下一张 (→)">&rsaquo;</button>
    <div class="lightbox-counter"></div>
  `;
  document.body.appendChild(lightboxEl);

  lightboxEl.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  lightboxEl.addEventListener('click', function(e) {
    if (e.target === lightboxEl) closeLightbox();
  });
  lightboxEl.querySelector('.lightbox-prev').addEventListener('click', function(e) {
    e.stopPropagation();
    navigateLightbox(-1);
  });
  lightboxEl.querySelector('.lightbox-next').addEventListener('click', function(e) {
    e.stopPropagation();
    navigateLightbox(1);
  });
  document.addEventListener('keydown', handleLightboxKey);
}

function handleLightboxKey(e) {
  if (!lightboxEl || !lightboxEl.classList.contains('active')) return;
  if (e.key === 'Escape') { closeLightbox(); return; }
  if (e.key === 'ArrowLeft')  { navigateLightbox(-1); return; }
  if (e.key === 'ArrowRight') { navigateLightbox(1); return; }
}

function getCategoryGroups() {
  var groups = { photo: [], video: [], poster: [], album: [], cert: [], resume: [] };

  document.querySelectorAll('#gallery-photo .gallery-item').forEach(function(el) {
    if (el.dataset.fullSrc) groups.photo.push(el.dataset.fullSrc);
  });
  document.querySelectorAll('#video-grid .video-card').forEach(function(el) {
    if (el.dataset.fullSrc) groups.video.push(el.dataset.fullSrc);
  });
  document.querySelectorAll('#gallery-poster .gallery-item').forEach(function(el) {
    if (el.dataset.fullSrc) groups.poster.push(el.dataset.fullSrc);
  });
  document.querySelectorAll('#gallery-album .gallery-item').forEach(function(el) {
    if (el.dataset.fullSrc) groups.album.push(el.dataset.fullSrc);
  });
  document.querySelectorAll('#cert-gallery .cert-item').forEach(function(el) {
    if (el.dataset.fullSrc) groups.cert.push(el.dataset.fullSrc);
  });
  document.querySelectorAll('.resume-wrap').forEach(function(el) {
    if (el.dataset.fullSrc) groups.resume.push(el.dataset.fullSrc);
  });

  return groups;
}

function openLightbox(src) {
  createLightbox();

  var groups = getCategoryGroups();
  var found = false;

  for (var key in groups) {
    var arr = groups[key];
    var idx = arr.indexOf(src);
    if (idx !== -1) {
      currentGroup = arr;
      currentIndex = idx;
      found = true;
      break;
    }
  }

  if (!found) {
    currentGroup = [src];
    currentIndex = 0;
  }

  lightboxEl.querySelector('img').src = src;
  lightboxEl.classList.add('active');
  document.body.style.overflow = 'hidden';
  updateNavUI();
}

function navigateLightbox(dir) {
  if (!currentGroup.length) return;
  currentIndex = (currentIndex + dir + currentGroup.length) % currentGroup.length;
  var newSrc = currentGroup[currentIndex];
  lightboxEl.querySelector('img').src = newSrc;
  updateNavUI();
}

function updateNavUI() {
  var prevBtn = lightboxEl.querySelector('.lightbox-prev');
  var nextBtn = lightboxEl.querySelector('.lightbox-next');
  var counter = lightboxEl.querySelector('.lightbox-counter');

  if (currentGroup.length <= 1) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    if (counter) counter.textContent = '';
  } else {
    prevBtn.style.display = '';
    nextBtn.style.display = '';
    if (counter) counter.textContent = (currentIndex + 1) + ' / ' + currentGroup.length;
  }
}

function closeLightbox() {
  if (!lightboxEl) return;
  lightboxEl.classList.remove('active');
  document.body.style.overflow = '';
}

// ==========================================
// --- Scroll Reveal ---
function setupScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// --- Nav scroll effect ---
function setupNavScroll() {
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.style.boxShadow = window.scrollY > 100
      ? '0 1px 20px rgba(0,0,0,0.06)'
      : 'none';
  });
}

// ==========================================
// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  buildPhotoGallery();
  buildVideoGrid();
  buildDesignGallery('gallery-poster', posterFiles, 'assets/design-poster/', 'assets/thumbs/design-poster/');
  buildDesignGallery('gallery-album', albumFiles, 'assets/design-album/', 'assets/thumbs/design-album/');
  buildCertGallery();
  setupResume();
  setupScrollReveal();
  setupNavScroll();

  // 显示视口内已可见的元素
  setTimeout(() => {
    document.querySelectorAll('.reveal').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) el.classList.add('visible');
    });
  }, 100);
});
