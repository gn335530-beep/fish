(function () {
  "use strict";
  var API = window.HaisenAPI;

  async function listSpecies() {
    var data = await API.request("/api/species");
    return (data && data.data) || [];
  }

  Object.assign(API, { listSpecies: listSpecies });
})();
