"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LoaderCircle, MapPin, Search } from "lucide-react";

interface ResearchResponse {
  researchId?: string;
  error?: string;
  code?: string;
}

interface AddressSuggestion {
  placeId: string;
  fullText: string;
  mainText: string;
  secondaryText: string;
}

interface SuggestionResponse {
  suggestions?: AddressSuggestion[];
  code?: string;
}

function newSessionToken(): string {
  return crypto.randomUUID();
}

export function ResearchForm() {
  const router = useRouter();
  const sessionToken = useRef(newSessionToken());
  const [address, setAddress] = useState("");
  const [selected, setSelected] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggesting, setSuggesting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [autocompleteAvailable, setAutocompleteAvailable] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autocompleteAvailable || selected || address.trim().length < 4) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSuggesting(true);
      try {
        const params = new URLSearchParams({
          q: address.trim(),
          sessionToken: sessionToken.current,
        });
        const response = await fetch(`/api/addresses/suggest?${params}`, { signal: controller.signal });
        const result = (await response.json()) as SuggestionResponse;
        if (result.code === "not_configured") {
          setAutocompleteAvailable(false);
          setSuggestions([]);
          return;
        }
        if (!response.ok) throw new Error("suggestion request failed");
        setSuggestions(result.suggestions ?? []);
        setActiveIndex(-1);
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) setSuggesting(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [address, autocompleteAvailable, selected]);

  async function selectSuggestion(suggestion: AddressSuggestion) {
    setResolving(true);
    setError(null);
    try {
      const response = await fetch("/api/addresses/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ placeId: suggestion.placeId, sessionToken: sessionToken.current }),
      });
      const result = (await response.json()) as { address?: string; error?: string };
      if (!response.ok || !result.address) throw new Error(result.error ?? "Harriett could not select that address.");
      setAddress(result.address);
      setSelected(true);
      setSuggestions([]);
      setActiveIndex(-1);
      sessionToken.current = newSessionToken();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Harriett could not select that address.");
    } finally {
      setResolving(false);
    }
  }

  function handleAddressKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      void selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuggestions([]);
    setWorking(true);
    try {
      const response = await fetch(`/api/properties/value?address=${encodeURIComponent(address)}`);
      const result = (await response.json()) as ResearchResponse;
      if (!response.ok || !result.researchId) {
        if (result.code === "rate_limited") {
          throw new Error("RentCast's monthly request limit has been reached. Existing research is still available below.");
        }
        throw new Error(result.error ?? "Harriett could not research that property.");
      }
      router.push(`/research/${result.researchId}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Harriett could not research that property.");
      setWorking(false);
    }
  }

  const listOpen = suggestions.length > 0;
  const inputIcon = resolving || suggesting
    ? <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
    : selected
      ? <Check size={18} aria-hidden="true" />
      : <Search size={18} aria-hidden="true" />;

  return (
    <form className="research-form" onSubmit={submit}>
      <label htmlFor="research-address">Property address</label>
      <div className="research-input-row">
        <div className="address-combobox">
          <span className={`research-input-shell${selected ? " address-selected" : ""}`}>
            {inputIcon}
            <input
              id="research-address"
              name="address"
              type="text"
              autoComplete="off"
              required
              minLength={5}
              maxLength={200}
              value={address}
              onChange={(event) => {
                const nextAddress = event.target.value;
                setAddress(nextAddress);
                setSelected(false);
                setError(null);
                if (nextAddress.trim().length < 4) {
                  setSuggestions([]);
                  setActiveIndex(-1);
                  setSuggesting(false);
                }
              }}
              onKeyDown={handleAddressKeyDown}
              placeholder="2320 Starlight Drive, Tuscaloosa, AL"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={listOpen}
              aria-controls="address-suggestions"
              aria-activedescendant={activeIndex >= 0 ? `address-suggestion-${activeIndex}` : undefined}
              aria-describedby={error ? "research-error" : "research-help"}
            />
          </span>
          {listOpen && (
            <div className="address-suggestions-popover">
              <ul id="address-suggestions" className="address-suggestions" role="listbox">
                {suggestions.map((suggestion, index) => (
                  <li
                    id={`address-suggestion-${index}`}
                    key={suggestion.placeId}
                    role="option"
                    aria-selected={index === activeIndex}
                  >
                    <button
                      type="button"
                      className={index === activeIndex ? "address-suggestion active" : "address-suggestion"}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => void selectSuggestion(suggestion)}
                    >
                      <MapPin size={17} aria-hidden="true" />
                      <span><strong>{suggestion.mainText}</strong><small>{suggestion.secondaryText}</small></span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="address-attribution" aria-label="Powered by Google">Powered by Google</div>
            </div>
          )}
        </div>
        <button type="submit" className="primary-button" disabled={working || resolving}>
          {working ? <LoaderCircle className="animate-spin" size={17} /> : <ArrowRight size={17} />}
          {working ? "Researching..." : "Start research"}
        </button>
      </div>
      <p id="research-help" className="field-help">
        {autocompleteAvailable ? "Choose an address, then use one RentCast valuation request." : "Enter the complete address. Research uses one RentCast valuation request."}
      </p>
      {error && <p id="research-error" className="field-error" role="alert">{error}</p>}
    </form>
  );
}
