/* 個人資訊評價區控制器：角色切換、第一頁、載入更多與重試。 */

import { roleCounts, defaultRole, reviewSectionHTML } from "./reviews.js";
import { listReviews } from "../api/reviews.js";

export function createReviewsController(options) {
  const section = options.section;
  const profile = options.profile;
  const pageSize = options.pageSize || 6;
  let requestId = 0;
  let state = {
    role: null, counts: { seller: 0, buyer: 0 }, summary: null,
    reviews: [], total: 0, hasMore: false, loading: false, error: ""
  };

  function render() {
    section.hidden = false;
    section.innerHTML = '<div class="profile-section__head"><h2>評價</h2></div>' +
      reviewSectionHTML(state, new Date());
  }

  async function load(role, append) {
    const current = ++requestId;
    const previous = append ? state.reviews : [];
    state = Object.assign({}, state, {
      role: role,
      reviews: previous,
      summary: append ? state.summary : null,
      hasMore: append ? state.hasMore : false,
      total: append ? state.total : 0,
      loading: true,
      error: ""
    });
    render();
    try {
      const data = await listReviews(profile.id, {
        role: role,
        offset: previous.length,
        limit: pageSize
      });
      if (current !== requestId) return;
      state = {
        role: role,
        counts: state.counts,
        summary: data.summary,
        reviews: previous.concat(data.reviews || []),
        total: Number(data.total || 0),
        hasMore: !!data.has_more,
        loading: false,
        error: ""
      };
    } catch (failure) {
      if (current !== requestId) return;
      state = Object.assign({}, state, {
        loading: false,
        error: failure.message || "評價載入失敗"
      });
    }
    render();
  }

  function start() {
    const counts = roleCounts(profile.rating);
    const role = defaultRole(counts);
    state = Object.assign({}, state, { role: role, counts: counts });
    render();
    if (role) load(role, false);
  }

  function handleClick(event) {
    const tab = event.target.closest("[data-review-role]");
    if (tab) {
      load(tab.dataset.reviewRole, false);
      return;
    }
    if (event.target.closest("[data-review-retry]")) {
      load(state.role, false);
      return;
    }
    if (event.target.closest("[data-review-more]")) {
      load(state.role, true);
    }
  }

  return { start: start, handleClick: handleClick };
}
