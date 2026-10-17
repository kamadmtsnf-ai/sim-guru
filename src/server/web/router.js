function getPageContent(pageName) {
  try {
    if (typeof pageName === 'string' && Object.prototype.hasOwnProperty.call(PAGE_RENDERERS_, pageName)) {
      return PAGE_RENDERERS_[pageName]();
    }
    return "<div class='p-4 text-red-500 font-bold'>Halaman tidak ditemukan: " + pageName + "</div>";
  } catch (e) {
    return "<div class='p-4 text-red-500 font-bold'>Error: " + e.toString() + "</div>";
  }
}
