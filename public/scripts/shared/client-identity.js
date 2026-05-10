(function attachClientIdentity(globalScope) {
  const STORAGE_KEY = "fillword-client-id";

  function generateClientId() {
    if (globalScope.crypto && typeof globalScope.crypto.randomUUID === "function") {
      return globalScope.crypto.randomUUID();
    }
    return "client-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function getClientId() {
    try {
      const existing = globalScope.localStorage.getItem(STORAGE_KEY);
      if (existing) return existing;
      const created = generateClientId();
      globalScope.localStorage.setItem(STORAGE_KEY, created);
      return created;
    } catch (_error) {
      return generateClientId();
    }
  }

  globalScope.FillwordIdentity = {
    getClientId,
  };
})(window);
