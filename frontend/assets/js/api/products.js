(function () {
  "use strict";
  var API = window.HaisenAPI;

  async function listProducts() {
    var data = await API.request("/api/products");
    return (data && data.data) || [];
  }

  async function getProduct(id) {
    var data = await API.request("/api/products/" + encodeURIComponent(id));
    return (data && data.data) || null;
  }

  /* 商品照片可能存成 /uploads/...（後端）、images/...（種子資料）或完整網址。 */
  function photoUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    if (path.charAt(0) === "/") {
      return (API.BASE || "") + path;
    }
    if (path.indexOf("../assets/") === 0 || path.indexOf("assets/") === 0) {
      return path.indexOf("../") === 0 ? path : "../" + path;
    }
    if (path.indexOf("images/") === 0) return "../assets/" + path;
    return path;
  }

  Object.assign(API, {
    listProducts: listProducts,
    getProduct: getProduct,
    photoUrl: photoUrl
  });
})();
