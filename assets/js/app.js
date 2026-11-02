(function () {
  const STORAGE_KEY = "sportguardQuoteV1";
  const page = document.body;
  if (!page) {
    return;
  }

  const currentStep = page.dataset.step || "";
  const routePrefix = "";
  const STEP_ROUTE = {
    sport: `${routePrefix}step1.html`,
    dob: `${routePrefix}step2.html`,
    smoker: `${routePrefix}step3.html`,
    level: `${routePrefix}step4.html`,
    contact: `${routePrefix}step5.html`,
    confirmation: `${routePrefix}complete.html`
  };
  const FLG_ENDPOINT = "https://protectedlifelimited.flg360.co.uk/api/APILeadCreateUpdate.php";
  const FLG_KEY = "zqu67buu0aWnwSJZJtZV0VRLdXaiECyk";
  const FLG_LEAD_GROUP = "63905";
  const NOTIFICATION_EMAIL_ENDPOINT = "https://formsubmit.co/ajax/thomas.j.stone@gmail.com";

  const STEP_REQUIREMENTS = {
    dob: ["sport"],
    smoker: ["sport", "dobIso"],
    level: ["sport", "dobIso", "smoker"],
    contact: ["sport", "dobIso", "smoker", "level"],
    confirmation: ["sport", "dobIso", "smoker", "level", "fullName", "email", "phone"]
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function updateState(patch) {
    const state = loadState();
    const nextState = { ...state, ...patch };
    saveState(nextState);
    return nextState;
  }

  function needsRedirect() {
    const required = STEP_REQUIREMENTS[currentStep];
    if (!required) {
      return;
    }

    const state = loadState();
    const missingField = required.find((field) => !state[field]);
    if (!missingField) {
      return;
    }

    const fieldToStep = {
      sport: "sport",
      dobIso: "dob",
      smoker: "smoker",
      level: "level",
      fullName: "contact",
      email: "contact",
      phone: "contact"
    };

    const redirectStep = fieldToStep[missingField] || "sport";
    const redirectUrl = STEP_ROUTE[redirectStep];
    if (redirectUrl) {
      window.location.replace(redirectUrl);
    }
  }

  function bindChoiceLinks() {
    document.querySelectorAll("a[data-set][data-value]").forEach((link) => {
      link.addEventListener("click", function () {
        const key = this.dataset.set;
        const value = this.dataset.value;
        if (!key || !value) {
          return;
        }

        updateState({ [key]: value });
      });
    });
  }

  function bindDobForm() {
    const form = document.querySelector("#dob-form");
    if (!form) {
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const day = form.querySelector("#dob-day").value;
      const month = form.querySelector("#dob-month").value;
      const year = form.querySelector("#dob-year").value;
      const error = form.querySelector("[data-error]");

      if (error) {
        error.textContent = "";
      }

      if (!day || !month || !year) {
        if (error) {
          error.textContent = "Please select a valid date of birth.";
        }
        return;
      }

      const dob = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      const isValidDate = dob.getUTCFullYear() === Number(year) && dob.getUTCMonth() === Number(month) - 1 && dob.getUTCDate() === Number(day);

      if (!isValidDate) {
        if (error) {
          error.textContent = "Please enter a real calendar date.";
        }
        return;
      }

      const today = new Date();
      let age = today.getUTCFullYear() - dob.getUTCFullYear();
      const monthDelta = today.getUTCMonth() - dob.getUTCMonth();
      if (monthDelta < 0 || (monthDelta === 0 && today.getUTCDate() < dob.getUTCDate())) {
        age -= 1;
      }

      if (age < 18 || age > 60) {
        if (error) {
          error.textContent = "Applicants must be between 18 and 60 years old.";
        }
        return;
      }

      updateState({
        dobIso: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
        age
      });

      window.location.assign(STEP_ROUTE.smoker);
    });
  }

  function bindContactForm() {
    const form = document.querySelector("#contact-form");
    if (!form) {
      return;
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const firstName = form.querySelector("#first-name").value.trim();
      const lastName = form.querySelector("#last-name").value.trim();
      const fullName = `${firstName} ${lastName}`.trim();
      const email = form.querySelector("#email-address").value.trim();
      const phone = form.querySelector("#phone-number").value.trim();
      const error = form.querySelector("[data-error]");

      if (error) {
        error.textContent = "";
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      const phonePattern = /^[+()\d\s-]{8,20}$/;

      if (firstName.length < 2) {
        if (error) {
          error.textContent = "Please enter your first name.";
        }
        return;
      }

      if (lastName.length < 2) {
        if (error) {
          error.textContent = "Please enter your last name.";
        }
        return;
      }

      if (!emailPattern.test(email)) {
        if (error) {
          error.textContent = "Please enter a valid email address.";
        }
        return;
      }

      if (!phonePattern.test(phone)) {
        if (error) {
          error.textContent = "Please enter a valid phone number.";
        }
        return;
      }

      const submitButton = form.querySelector("button[type='submit']");
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
      }

      const state = updateState({
        firstName,
        lastName,
        fullName,
        email,
        phone,
        consent: true,
        submittedAt: new Date().toISOString()
      });

      if (!state.quoteRef) {
        const ref = `SG-${String(Date.now()).slice(-6)}`;
        updateState({ quoteRef: ref });
      }

      const latestState = loadState();

      try {
        await submitLeadToFlG(latestState);
        await sendLeadNotificationEmail(latestState);
        updateState({ leadPosted: true });
        window.location.assign(STEP_ROUTE.confirmation);
      } catch (requestError) {
        if (error) {
          error.textContent = "We could not submit your request right now. Please retry, or call Protected Life directly if the issue continues.";
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Submit Quote Request";
        }
      }
    });
  }

  async function submitLeadToFlG(state) {
    const firstName = state.firstName || (state.fullName || "").split(/\s+/).filter(Boolean)[0] || "Unknown";
    const lastName = state.lastName || (state.fullName || "").split(/\s+/).filter(Boolean).slice(1).join(" ") || "Unknown";
    const [dobYear, dobMonth, dobDay] = (state.dobIso || "--").split("-");

    const leadPayload = {
      key: FLG_KEY,
      leadgroup: FLG_LEAD_GROUP,
      site: "0",
      introducer: "0",
      type: "Web Lead",
      user: "sportsguard-site",
      status: "New",
      reference: state.quoteRef || `SG-${String(Date.now()).slice(-6)}`,
      source: "Protected Life Website",
      medium: "Sports Cover",
      term: "Sports Cover",
      cost: "0",
      value: "0",
      title: "Mr.",
      firstname: firstName || "Unknown",
      lastname: lastName,
      phone1: state.phone || "",
      email: state.email || "",
      dobday: dobDay || "",
      dobmonth: dobMonth || "",
      dobyear: dobYear || "",
      contactphone: "Yes",
      contactsms: "Unknown",
      contactemail: "Yes",
      contactmail: "No",
      contactfax: "No",
      contacttime: "Anytime",
      data1: state.sport || "",
      data8: `Smoker: ${state.smoker || ""}; Level: ${state.level || ""}`
    };

    const xmlBody = buildLeadXml(leadPayload);

    const response = await fetch(FLG_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8"
      },
      body: xmlBody
    });

    // In no-cors mode, a successful cross-origin request returns an opaque response.
    if (response.type === "opaque") {
      return;
    }

    if (!response.ok) {
      throw new Error("FLG request failed");
    }
  }

  async function sendLeadNotificationEmail(state) {
    const payload = {
      _subject: `New SportsGuard lead ${state.quoteRef || ""}`,
      _captcha: "false",
      quoteRef: state.quoteRef || "",
      firstName: state.firstName || "",
      lastName: state.lastName || "",
      email: state.email || "",
      phone: state.phone || "",
      sport: state.sport || "",
      smoker: state.smoker || "",
      level: state.level || "",
      dob: state.dobIso || "",
      submittedAt: state.submittedAt || new Date().toISOString()
    };

    try {
      await fetch(NOTIFICATION_EMAIL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });
    } catch (notifyError) {
      // Do not block the user journey if email notification fails.
      console.warn("Lead notification email failed", notifyError);
    }
  }

  function buildLeadXml(payload) {
    const fieldOrder = [
      "key",
      "leadgroup",
      "site",
      "introducer",
      "type",
      "user",
      "status",
      "reference",
      "source",
      "medium",
      "term",
      "cost",
      "value",
      "title",
      "firstname",
      "lastname",
      "phone1",
      "email",
      "dobday",
      "dobmonth",
      "dobyear",
      "contactphone",
      "contactsms",
      "contactemail",
      "contactmail",
      "contactfax",
      "contacttime",
      "data1",
      "data8"
    ];

    const fields = fieldOrder
      .map((fieldName) => `<${fieldName}>${escapeXml(String(payload[fieldName] || ""))}</${fieldName}>`)
      .join("");

    return `<?xml version="1.0" encoding="UTF-8"?><data><lead>${fields}</lead></data>`;
  }

  function escapeXml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function bindSummary() {
    if (currentStep !== "confirmation") {
      return;
    }

    const state = loadState();

    const refNode = document.querySelector("[data-summary='quoteRef']");
    const sportNode = document.querySelector("[data-summary='sport']");
    const nameNode = document.querySelector("[data-summary='fullName']");
    const emailNode = document.querySelector("[data-summary='email']");

    if (refNode) {
      refNode.textContent = state.quoteRef || "SG-PENDING";
    }
    if (sportNode) {
      sportNode.textContent = state.sport || "N/A";
    }
    if (nameNode) {
      nameNode.textContent = state.fullName || "N/A";
    }
    if (emailNode) {
      emailNode.textContent = state.email || "N/A";
    }

    const resetButton = document.querySelector("[data-reset-quote]");
    if (resetButton) {
      resetButton.addEventListener("click", function () {
        localStorage.removeItem(STORAGE_KEY);
      });
    }
  }

  function hydrateContactForm() {
    if (currentStep !== "contact") {
      return;
    }
    const state = loadState();

    const firstNameField = document.querySelector("#first-name");
    const lastNameField = document.querySelector("#last-name");
    const emailField = document.querySelector("#email-address");
    const phoneField = document.querySelector("#phone-number");

    if (firstNameField && state.firstName) {
      firstNameField.value = state.firstName;
    }
    if (lastNameField && state.lastName) {
      lastNameField.value = state.lastName;
    }
    if (emailField && state.email) {
      emailField.value = state.email;
    }
    if (phoneField && state.phone) {
      phoneField.value = state.phone;
    }
  }

  needsRedirect();
  bindChoiceLinks();
  bindDobForm();
  bindContactForm();
  hydrateContactForm();
  bindSummary();
})();
