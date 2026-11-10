/* 個人資訊商品區：數量、管理切換與商品卡選項；不含上架紀錄入口。 */

function sectionCount(count) {
  return '<span class="profile-section__count">' + Number(count || 0) + ' 件</span>';
}

export function productSectionHTML(products, options) {
  const rows = products || [];
  const settings = options || {};
  const isSelf = !!settings.isSelf;
  const managing = !!settings.managing;
  const renderCard = settings.renderCard || function (product, cardOptions) {
    return globalThis.productCardHTML(product, cardOptions);
  };
  const manage = isSelf
    ? '<button class="btn btn--ghost btn--sm" type="button" data-profile-manage>' +
      (managing ? "完成" : "管理商品") + "</button>"
    : "";
  const head = '<div class="profile-section__head">' +
    '<div><h2>商品</h2>' + sectionCount(rows.length) + "</div>" + manage + "</div>";

  if (!rows.length) {
    return head + '<p class="profile-empty">' +
      (isSelf ? "你還沒有上架商品" : "目前沒有上架商品") + "</p>";
  }

  const cards = rows.map(function (product) {
    return renderCard(product, {
      hideSeller: true,
      own: isSelf && !managing,
      manage: isSelf && managing
    });
  }).join("");
  return head + '<div class="grid grid--4 catch-grid profile-products">' + cards + "</div>";
}
