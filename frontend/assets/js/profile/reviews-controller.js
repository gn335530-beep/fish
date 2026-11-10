/* 個人資訊評價區控制器：角色切換、排序、星等篩選、分頁與重試。 */

import { roleCounts, defaultRole, reviewSectionHTML } from "./reviews.js";
import { listReviews } from "../api/reviews.js";

function emptyTab() {
  return {
    sort: "newest", rating: 0, summary: null, reviews: [],
    total: 0, hasMore: false, loading: false, error: "", loaded: false
  };
}

export function createReviewsController(options) {
  const section = options.section;
  const profile = options.profile;
  const pageSize = options.pageSize || 6;
  const requestIds = { seller: 0, buyer: 0 };
  let state = {
    role: null,
    counts: { seller: 0, buyer: 0 },
    roles: { seller: emptyTab(), buyer: emptyTab() }
  };

  function activeState() {
    if (!state.role) return { role: null, counts: state.counts };
    return Object.assign({}, state.roles[state.role], {
      role: state.role,
      counts: state.counts
    });
  }

  function tabOf(role) {
    return state.roles[role || state.role];
  }

  function render() {
    section.hidden = false;
    section.innerHTML = '<div class="profile-section__head"><h2>評價</h2></div>' +
      reviewSectionHTML(activeState(), new Date());
  }

  async function load(role, append) {
    const tab = state.roles[role];
    const current = ++requestIds[role];
    const previous = append ? tab.reviews : [];
    state.roles[role] = Object.assign({}, tab, {
      reviews: previous,
      loading: true,
      error: ""
    });
    render();
    try {
      const data = await listReviews(profile.id, {
        role: role,
        sort: tab.sort,
        rating: tab.rating || undefined,
        offset: previous.length,
        limit: pageSize
      });
      if (current !== requestIds[role]) return;
      state.roles[role] = Object.assign({}, state.roles[role], {
        summary: data.summary,
        reviews: previous.concat(data.reviews || []),
        total: Number(data.total || 0),
        hasMore: !!data.has_more,
        loading: false,
        error: "",
        loaded: true
      });
    } catch (failure) {
      if (current !== requestIds[role]) return;
      state.roles[role] = Object.assign({}, state.roles[role], {
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
    if (role) return load(role, false);
  }

  async function handleClick(event) {
    const tab = event.target.closest("[data-review-role]");
    if (tab) {
      state.role = tab.dataset.reviewRole;
      render();
      if (!tabOf().loaded && !tabOf().loading) await load(state.role, false);
      return;
    }
    if (event.target.closest("[data-review-retry]")) {
      await load(state.role, false);
      return;
    }
    if (event.target.closest("[data-review-more]")) {
      await load(state.role, true);
      return;
    }
    if (event.target.closest("[data-review-clear-rating]")) {
      tabOf().rating = 0;
      await load(state.role, false);
      return;
    }
    const star = event.target.closest("[data-review-rating]");
    if (star) {
      const value = Number(star.dataset.reviewRating) || 0;
      tabOf().rating = tabOf().rating === value ? 0 : value;
      await load(state.role, false);
    }
  }

  async function handleChange(event) {
    const sort = event.target.closest("[data-review-sort]");
    if (!sort) return;
    tabOf().sort = sort.value;
    await load(state.role, false);
  }

  return { start: start, handleClick: handleClick, handleChange: handleChange };
}
