// components/BookingForm.tsx
"use client";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Check } from "lucide-react";
import {
  SERVICES,
  DURATIONS,
  PRICES,
  SERVICES_BY_CATEGORY,
  CATEGORY_LABELS,
  MASSAGE_CATEGORIES,
  SERVICE_CATALOG,
  getServiceByName,
  ServiceCatalogItem,
} from "@/lib/services.catalog";

// Time step for mobile select dropdown (15 minutes)
const TIME_STEP_MIN = 15;

// Helper: Build time options for select dropdown
const buildTimeOptions = (start: string, end: string, stepMin: number): string[] => {
  const options: string[] = [];
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  for (let mins = startMinutes; mins <= endMinutes; mins += stepMin) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    options.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
  }

  return options;
};

// Helper: Round up time to next step interval
const roundUpToStep = (time: string, stepMin: number): string => {
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m;
  const roundedMinutes = Math.ceil(totalMinutes / stepMin) * stepMin;
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

type FormState = {
  service: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  company?: string; // 蜜罐
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const createInitialFormState = (): FormState => ({
  service: SERVICES[0],
  date: "",
  time: "",
  name: "",
  email: "",
  phone: "",
  notes: "",
  company: "",
});
const createTouchedState = () => ({
  service: false,
  date: false,
  time: false,
  name: false,
  email: false,
  phone: false,
  notes: false,
});
type TouchedState = ReturnType<typeof createTouchedState>;

type BookingFormProps = {
  endpoint?: string;
  initial?: Partial<FormState>;
  onSuccess?: (data: any) => void;
  submitLabel?: string;
  hideHoneypot?: boolean;
  compact?: boolean;
};

export default function BookingForm({
  endpoint = "/api/book",
  initial = {},
  onSuccess,
  submitLabel = "Confirm Appointment",
  hideHoneypot = false,
  compact = false,
}: BookingFormProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    ...createInitialFormState(),
    ...initial,
  });
  const [touched, setTouched] = useState<TouchedState>(createTouchedState());
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Structured metadata state
  const [selectedOfferCode, setSelectedOfferCode] = useState<string | null>(
    null,
  );
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  // Service selection (mutually exclusive)
  const [selectedMassageType, setSelectedMassageType] = useState<string | null>(null);
  const [selectedMassageMinutes, setSelectedMassageMinutes] = useState<number | null>(null);
  const [selectedTherapyService, setSelectedTherapyService] = useState<string | null>(null);

  // Mobile tab selection
  const [activeServiceTab, setActiveServiceTab] = useState<"massage" | "therapy">("massage");

  // Summary visibility for mobile
  const [showSummary, setShowSummary] = useState(false);

  // Desktop detection (SSR-safe)
  const [isDesktop, setIsDesktop] = useState(false);

  // Step navigation
  const [currentStep, setCurrentStep] = useState(1);

  // Time availability validation
  const [checkingTime, setCheckingTime] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [suggestedTimes, setSuggestedTimes] = useState<string[]>([]);

  // Dynamic Services
  const [dynamicCatalog, setDynamicCatalog] = useState<any[]>([]);
  const [servicesByCategory, setServicesByCategory] = useState<any>({});
  const [massageTypes, setMassageTypes] = useState<any[]>([]);
  const [isServicesLoading, setIsServicesLoading] = useState(true);

  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => {
         let mapped: any[] = [];
         data.forEach((item: any) => {
             const isMassage = item.category === "Standard Massage" || item.category === "Specialized Therapy";
             const mappedCategory = isMassage ? item.title : (item.category === "Other" ? "other" : "therapy");
             
             if (item.options && item.options.length > 0) {
                 item.options.forEach((opt: any) => {
                     const priceNum = parseFloat(opt.price.replace(/[^0-9.-]+/g,"")) || 0;
                     mapped.push({
                         name: `${item.title} (${opt.time}m)`,
                         baseName: item.title,
                         category: mappedCategory,
                         isMassage,
                         minutes: parseInt(opt.time) || 60,
                         priceCents: priceNum * 100,
                         available: item.is_active,
                         description: item.description
                     });
                 });
             } else {
                 mapped.push({
                     name: item.title,
                     baseName: item.title,
                     category: mappedCategory,
                     isMassage,
                     minutes: 60,
                     priceCents: 0,
                     available: item.is_active,
                     description: item.description
                 });
             }
         });
         
         setDynamicCatalog(mapped);
         
         const byCategory = mapped.filter(s => s.available).reduce((acc, service) => {
            if (!acc[service.category]) {
                acc[service.category] = [];
            }
            acc[service.category].push(service);
            return acc;
         }, {} as Record<string, any[]>);
         
         setServicesByCategory(byCategory);
         
         // Dynamically generate massage types from the active massage services
         const mTypes: any[] = [];
         mapped.filter(s => s.available && s.isMassage).forEach(s => {
             if (!mTypes.find(m => m.key === s.baseName)) {
                 mTypes.push({
                     key: s.baseName,
                     label: s.baseName,
                     category: s.category
                 });
             }
         });
         setMassageTypes(mTypes);
         setIsServicesLoading(false);
      })
      .catch(err => {
         console.error('Failed to load dynamic services, using fallback:', err);
         setIsServicesLoading(false);
      });
  }, []);

  // Clear time error when date or time changes
  useEffect(() => {
    if (timeError) {
      setTimeError(null);
      setSuggestedTimes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date, form.time]);

  // Deep-link preselect: compute params from URL (updates on navigation)
  const serviceParam = searchParams.get("service");
  const minutesParam = searchParams.get("minutes");

  // Deep-link preselect: handle ?service=<code>&minutes=<duration>
  useEffect(() => {
    if (!serviceParam || massageTypes.length === 0 || dynamicCatalog.length === 0) return;

    // Check if it's a massage type
    const massageType = massageTypes.find((mt) => mt.key === serviceParam || mt.label === serviceParam);
    if (massageType) {
      // It's a massage service - clear therapy selection
      setSelectedTherapyService(null);
      setSelectedMassageType(massageType.key);
      setActiveServiceTab("massage");

      if (minutesParam) {
        const minutes = parseInt(minutesParam, 10);
        if (!isNaN(minutes)) {
          setSelectedMassageMinutes(minutes);
        } else {
          setSelectedMassageMinutes(null);
        }
      } else {
        setSelectedMassageMinutes(null);
      }

      // Scroll to massage section after a small delay
      setTimeout(() => {
        massageSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } else {
      // Check if it's a therapy service (full service name)
      const therapyService = dynamicCatalog.find(
        (s) => !s.isMassage && (s.name === serviceParam || s.baseName === serviceParam)
      );
      if (therapyService) {
        // It's a therapy service - clear massage selection
        setSelectedMassageType(null);
        setSelectedMassageMinutes(null);
        setSelectedTherapyService(therapyService.name);
        setActiveServiceTab("therapy");

        // Scroll to therapy section after a small delay
        setTimeout(() => {
          therapySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [serviceParam, minutesParam, massageTypes, dynamicCatalog]);

  // Refs for scrolling to sections
  const massageSectionRef = useRef<HTMLDivElement>(null);
  const therapySectionRef = useRef<HTMLDivElement>(null);
  const topAnchorRef = useRef<HTMLDivElement>(null);

  // Switch functions for service type
  const switchToMassage = () => {
    setSelectedTherapyService(null);
    setSelectedMassageType(null);
    setSelectedMassageMinutes(null);
    setActiveServiceTab("massage");
    setTimeout(() => {
      massageSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };

  const switchToTherapy = () => {
    setSelectedMassageType(null);
    setSelectedMassageMinutes(null);
    setSelectedTherapyService(null);
    setSelectedAddons([]); // Clear addons when switching to therapy
    setActiveServiceTab("therapy");
    setTimeout(() => {
      therapySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };

  const formErrors = useMemo(
    () => ({
      service: "",
      date: form.date ? "" : "Choose a date for your visit.",
      time: form.time ? "" : "Select a preferred time.",
      name: form.name.trim() ? "" : "Your name is required.",
      email: emailRegex.test(form.email) ? "" : "Enter a valid email address.",
      phone: form.phone.trim().length >= 7 ? "" : "Phone number is required.",
      notes: "",
    }),
    [form],
  );

  const showFieldError = (field: keyof typeof formErrors) =>
    (touched[field] || submitAttempted) && formErrors[field]
      ? formErrors[field]
      : "";

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const markTouched = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Handle localStorage offer
  useEffect(() => {
    // Load offer from localStorage
    const loadOffer = () => {
      try {
        const offerCode = localStorage.getItem("christmas_offer_selected");
        setSelectedOfferCode(offerCode);
      } catch (e) {
        // localStorage not available
      }
    };

    loadOffer();

    // Listen for storage changes (cross-tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "christmas_offer_selected") {
        loadOffer();
      }
    };

    // Listen for custom event (same-tab)
    const handleOfferChanged = () => {
      loadOffer();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("offer:changed", handleOfferChanged);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("offer:changed", handleOfferChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute selectedServiceName (single source of truth)
  const selectedServiceName = selectedTherapyService
    ? selectedTherapyService
    : (selectedMassageType && selectedMassageMinutes)
      ? `${selectedMassageType} (${selectedMassageMinutes}m)`
      : null;

  // Effect: sync selectedServiceName to form.service
  useEffect(() => {
    if (selectedServiceName) {
      handleFieldChange("service", selectedServiceName);
      markTouched("service");
    } else {
      handleFieldChange("service", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceName]);

  // Effect: clear addons for 60/90-min massage (not eligible for paid addons)
  useEffect(() => {
    const service = dynamicCatalog.find(s => s.name === form.service) || getServiceByName(form.service);
    const minutes = service?.minutes || 0;
    const isMassage = form.service.toLowerCase().includes("massage");

    // Clear addons if it's a 60/90-min massage (they should use packages)
    if (isMassage && minutes >= 60) {
      setSelectedAddons([]);
    }
  }, [form.service]);

  // Effect: detect desktop (SSR-safe)
  useEffect(() => {
    const checkDesktop = () => {
      if (typeof window !== "undefined") {
        setIsDesktop(window.innerWidth >= 768);
      }
    };

    checkDesktop();

    if (typeof window !== "undefined") {
      window.addEventListener("resize", checkDesktop);
      return () => window.removeEventListener("resize", checkDesktop);
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    setLoading(true);
    setOk(null);
    setErr(null);
    const hasErrors = Object.values(formErrors).some(Boolean);
    if (hasErrors) {
      setLoading(false);
      setErr("Please fix the highlighted fields.");
      return;
    }
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          offer_code: selectedOfferCode || undefined,
          addons: selectedAddons.length > 0 ? selectedAddons : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Get error code from response
        const errorCode = data.error || "generic";
        // Navigate to failure page with error code
        router.push(`/booking/failure?code=${encodeURIComponent(errorCode)}`);
        return;
      }

      if (onSuccess) {
        // If custom success handler provided, use it
        onSuccess(data);
      } else {
        // Navigate to success page (optionally with booking ID)
        const bookingId = data.data?.id || data.id;
        const successUrl = bookingId
          ? `/booking/success?ref=${bookingId}`
          : "/booking/success";
        router.push(successUrl);
      }
    } catch (e: any) {
      // Navigate to failure page with generic error
      router.push(`/booking/failure?code=generic`);
    } finally {
      setLoading(false);
    }
  }

  const gapClass = compact ? "gap-3" : "gap-4";

  // Get service details for add-ons eligibility
  const selectedService = dynamicCatalog.find(s => s.name === form.service) || getServiceByName(form.service);
  const selectedMinutes = selectedService?.minutes || 0;
  const isMassageService =
    form.service.toLowerCase().includes("massage") ||
    form.service.toLowerCase().includes("spa");
  const eligibleComplimentary = isMassageService && selectedMinutes >= 60;

  // Computed values for summary
  const hasDateTime = !!(form.date && form.time);
  const hasCustomerInfo = !!(form.name && form.email && form.phone);

  // Get today's date in YYYY-MM-DD format (local time, not UTC)
  const getLocalISODate = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const todayDate = getLocalISODate();

  // Check if selected datetime is in the past
  const isDatetimeInPast = (): boolean => {
    if (!form.date || !form.time) return false;
    const selectedDatetime = new Date(`${form.date}T${form.time}`);
    const now = new Date();
    return selectedDatetime < now;
  };

  // Get minimum time for today (current time + 1 hour buffer, rounded to next 5 minutes)
  const getMinTimeForToday = (): string => {
    const now = new Date();
    now.setHours(now.getHours() + 1); // Add 1 hour buffer

    // Round up to next 5-minute mark
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 5) * 5;

    if (roundedMinutes >= 60) {
      now.setHours(now.getHours() + 1);
      now.setMinutes(0);
    } else {
      now.setMinutes(roundedMinutes);
    }

    return now.toTimeString().slice(0, 5); // HH:MM format
  };

  // Compute time options for select based on selected date
  const timeOptions = useMemo(() => {
    if (form.date === todayDate) {
      const minTime = roundUpToStep(getMinTimeForToday(), TIME_STEP_MIN);
      return buildTimeOptions(minTime, "21:00", TIME_STEP_MIN);
    }
    return buildTimeOptions("09:00", "21:00", TIME_STEP_MIN);
  }, [form.date]);

  // Reset form.time if it becomes invalid when date changes
  useEffect(() => {
    if (form.time && !timeOptions.includes(form.time)) {
      setForm((prev) => ({ ...prev, time: "" }));
    }
  }, [form.date, form.time, timeOptions]);

  // Step indicators
  const steps = [
    { label: "Service", completed: !!form.service },
    { label: "Date & Time", completed: hasDateTime },
    { label: "Details", completed: hasCustomerInfo },
    { label: "Review", completed: false },
  ];

  // Step validation
  const canProceedFromStep = (step: number): boolean => {
    if (step === 1) return !!selectedServiceName;
    if (step === 2) return hasDateTime && !isDatetimeInPast();
    if (step === 3) return hasCustomerInfo;
    return false;
  };

  // Robust scroll to top function (works on iOS Safari and all browsers)
  const scrollToTop = useCallback(() => {
    // Primary method: scroll to anchor element
    if (topAnchorRef.current) {
      topAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Fallback methods for mobile quirks (iOS Safari, etc.)
    if (typeof window !== "undefined") {
      // Try window.scrollTo
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (e) {
        window.scrollTo(0, 0);
      }

      // Try document.documentElement.scrollTo
      if (document.documentElement) {
        try {
          document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
          document.documentElement.scrollTop = 0;
        }
      }

      // Try document.body.scrollTo
      if (document.body) {
        try {
          document.body.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
          document.body.scrollTop = 0;
        }
      }
    }
  }, []);

  // Validate selected time availability
  const validateSelectedTime = async (): Promise<boolean> => {
    if (!form.date || !form.time) return false;

    setCheckingTime(true);
    setTimeError(null);
    setSuggestedTimes([]);

    try {
      // Fetch busy times for the selected date
      const res = await fetch(`/api/availability?date=${encodeURIComponent(form.date)}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        // Log detailed error for debugging (dev only)
        if (process.env.NODE_ENV === 'development') {
          console.error(`Availability check failed: ${res.status} ${res.statusText}`);
        }

        // Only show "Unable to check" if request actually failed (not a 200 with no data)
        if (res.status >= 500) {
          setTimeError("Couldn't check availability. Please try again.");
        } else if (res.status === 400) {
          setTimeError("Invalid date. Please select a valid date.");
        } else {
          setTimeError("Couldn't check availability. Please try again.");
        }
        return false;
      }

      // Parse JSON safely
      let responseData;
      try {
        responseData = await res.json();
      } catch (jsonError) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Failed to parse availability response:", jsonError);
        }
        setTimeError("Couldn't check availability. Please try again.");
        return false;
      }

      const { busyIntervals } = responseData;

      // Ensure busyIntervals is an array
      if (!Array.isArray(busyIntervals)) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Invalid busy slots format:", busyIntervals);
        }
        setTimeError("Couldn't check availability. Please try again.");
        return false;
      }

      // Get service duration
      const selectedService = dynamicCatalog.find(s => s.name === form.service) || getServiceByName(form.service);
      const durationMinutes = selectedService?.minutes || 60;

      // Parse selected time to get start and end timestamps
      const selectedStart = new Date(`${form.date}T${form.time}`);
      const selectedEnd = new Date(selectedStart.getTime() + durationMinutes * 60000);

      // Check if selected time conflicts with any busy slot
      const hasConflict = busyIntervals.some((slot: { start_at: string; end_at: string }) => {
        const busyStart = new Date(slot.start_at);
        const busyEnd = new Date(slot.end_at);
        // Conflict if: selectedStart < busyEnd AND selectedEnd > busyStart
        return selectedStart < busyEnd && selectedEnd > busyStart;
      });

      if (hasConflict) {
        // Convert busyIntervals to legacy format for findNearestAvailableTimes
        const busySlots = busyIntervals.map((slot: { start_at: string; end_at: string }) => ({
          start: slot.start_at,
          end: slot.end_at,
        }));

        // Find suggested times (nearest 3 available times on same date)
        const suggestions = findNearestAvailableTimes(
          form.date,
          form.time,
          busySlots,
          durationMinutes,
          TIME_STEP_MIN,
        );

        if (suggestions.length > 0) {
          setTimeError("Time not available.");
          setSuggestedTimes(suggestions);
        } else {
          setTimeError("Time not available.");
          setSuggestedTimes([]);
        }

        return false;
      }

      // Time is available
      return true;
    } catch (error) {
      // Network error or other unexpected error
      if (process.env.NODE_ENV === 'development') {
        console.error("Error validating time:", error);
      }
      setTimeError("Couldn't check availability");
      return false;
    } finally {
      setCheckingTime(false);
    }
  };

  // Find nearest available times (up to 3 suggestions)
  const findNearestAvailableTimes = (
    date: string,
    selectedTime: string,
    busySlots: { start: string; end: string }[],
    durationMinutes: number,
    stepMin: number = TIME_STEP_MIN,
  ): string[] => {
    const suggestions: { time: string; diff: number }[] = [];
    const selectedMinutes = timeToMinutes(selectedTime);

    // Check times in stepMin intervals, up to ±4 hours from selected time
    const checkRange = 4 * 60; // 4 hours in minutes

    for (let offset = stepMin; offset <= checkRange; offset += stepMin) {
      // Check both before and after selected time
      const timesToCheck = [
        selectedMinutes + offset,
        selectedMinutes - offset,
      ].filter(m => m >= 0 && m < 24 * 60); // Keep within 00:00-23:59

      for (const mins of timesToCheck) {
        const timeStr = minutesToTime(mins);
        const testStart = new Date(`${date}T${timeStr}`);
        const testEnd = new Date(testStart.getTime() + durationMinutes * 60000);

        // Check if this time conflicts with any busy slot
        const conflicts = busySlots.some((slot: { start: string; end: string }) => {
          const busyStart = new Date(slot.start);
          const busyEnd = new Date(slot.end);
          return testStart < busyEnd && testEnd > busyStart;
        });

        if (!conflicts) {
          suggestions.push({
            time: timeStr,
            diff: Math.abs(offset),
          });

          // Stop if we have 3 suggestions
          if (suggestions.length >= 3) {
            break;
          }
        }
      }

      if (suggestions.length >= 3) break;
    }

    // Sort by time difference and return time strings
    return suggestions
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 3)
      .map(s => s.time);
  };

  // Helper: Convert HH:MM to minutes
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Helper: Convert minutes to HH:MM
  const minutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const handleNext = async () => {
    if (currentStep < 4 && canProceedFromStep(currentStep)) {
      // Special handling for Step 2: validate time availability
      if (currentStep === 2) {
        const isAvailable = await validateSelectedTime();
        if (!isAvailable) {
          return; // Don't proceed if time is not available
        }
      }

      setCurrentStep(currentStep + 1);
      // Double RAF to ensure DOM/layout updated before scrolling
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToTop());
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Double RAF to ensure DOM/layout updated before scrolling
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToTop());
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Scroll anchor for mobile navigation */}
      <div ref={topAnchorRef} className="absolute" aria-hidden="true" />

      {/* Step Header - Desktop: Horizontal stepper with proper flex, Mobile: Progress bar */}
      <div className="mb-8">
        {/* Mobile: Step indicator + progress bar */}
        <div className="block md:hidden">
          <div className="mb-3 text-center">
            <div className="text-sm font-semibold text-zinc-900">
              Step {currentStep} of {steps.length}
            </div>
            <div className="text-xs text-zinc-600 mt-1">
              {steps[currentStep - 1].label}
            </div>
          </div>
          <div className="w-full bg-zinc-200 rounded-full h-2">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Desktop: Horizontal stepper with proper flex layout */}
        <div className="hidden md:flex items-center overflow-visible">
          {steps.map((step, index) => (
            <div key={step.label} className="flex items-center" style={{ flex: index < steps.length - 1 ? 1 : '0 0 auto' }}>
              <div className="flex flex-col items-center">
                <div
                  className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold leading-none transition-colors ${
                    index + 1 === currentStep
                      ? "bg-blue-600 text-white ring-4 ring-blue-200"
                      : step.completed
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {index + 1}
                </div>
                <span
                  className={`text-xs mt-2 font-medium whitespace-nowrap ${
                    index + 1 === currentStep
                      ? "text-blue-600"
                      : "text-zinc-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-px mx-4 transition-colors ${
                    step.completed ? "bg-emerald-600" : "bg-zinc-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        {/* Left Column: Form */}
        <form
          onSubmit={submit}
          className={`grid ${gapClass}`}
          noValidate
          aria-live="polite"
        >
          {/* 蜜罐（隐藏） */}
          {!hideHoneypot && (
            <div style={{ display: "none" }} aria-hidden="true">
              <label htmlFor="booking-company">Company</label>
              <input
                id="booking-company"
                type="text"
                value={form.company || ""}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
          )}

          {/* Step 1: Service Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-zinc-900">
                Choose Your Service
              </h3>

              {isServicesLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
                  <p className="text-sm text-zinc-500">Loading services...</p>
                </div>
              ) : (
                <>
                  {/* Mobile: Tabs for Massage | Therapies */}
                  <div className="flex gap-2 border-b border-zinc-200 md:hidden">
                    <button
                      type="button"
                      onClick={() => setActiveServiceTab("massage")}
                      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                        activeServiceTab === "massage"
                          ? "border-zinc-900 text-zinc-900"
                          : "border-transparent text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      Massage
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveServiceTab("therapy")}
                      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                        activeServiceTab === "therapy"
                          ? "border-zinc-900 text-zinc-900"
                          : "border-transparent text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      Therapies
                    </button>
                  </div>

                  {/* Massage Selection (2-stage) */}
                  {(activeServiceTab === "massage" || isDesktop) && (
                    <div
                      ref={massageSectionRef}
                      className={`space-y-4 transition-opacity ${selectedTherapyService ? 'opacity-40' : ''}`}
                    >
                      <h4 className="text-sm font-semibold text-zinc-700 md:block hidden">
                        Massage Services
                      </h4>

                      {selectedTherapyService && (
                        <div className="flex items-center justify-between gap-3 bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                          <p className="text-xs text-zinc-700 flex-1">
                            Therapy service selected.
                          </p>
                          <button
                            type="button"
                            onClick={switchToMassage}
                            className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-800 transition"
                            aria-label="Switch to massage services"
                          >
                            Switch to Massage
                          </button>
                        </div>
                      )}

                      {/* Stage A: Choose massage type */}
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-2">
                          1. Choose Massage Type
                        </label>
                        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                          {massageTypes.map((massageType) => {
                            const services = servicesByCategory[massageType.category] || [];
                            const hasServices = services.length > 0;
                            const isSelected = selectedMassageType === massageType.key;
                            const desc = services[0]?.description || "";

                            if (!hasServices) return null;

                            return (
                              <button
                                key={massageType.key}
                                type="button"
                                onClick={() => {
                                  setSelectedTherapyService(null);
                                  setSelectedMassageType(massageType.key);
                                  setSelectedMassageMinutes(null);
                                }}
                                className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                                  isSelected
                                    ? "border-zinc-900 bg-zinc-50"
                                    : "border-zinc-200 bg-white hover:border-zinc-400"
                                }`}
                              >
                                {isSelected && (
                                  <div className="absolute top-3 right-3">
                                    <div className="bg-zinc-900 rounded-full p-1">
                                      <Check className="h-4 w-4 text-white" />
                                    </div>
                                  </div>
                                )}
                                <div className="pr-8">
                                  <div className="font-semibold text-sm text-zinc-900 mb-1">
                                    {massageType.label}
                                  </div>
                                  {desc && (
                                    <p className="text-xs text-zinc-500">{desc}</p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Stage B: Choose duration (only show if type is selected) */}
                      {selectedMassageType && (
                        <div>
                          <label className="block text-xs font-medium text-zinc-600 mb-2">
                            2. Choose Duration
                          </label>
                          <div className="flex flex-wrap gap-3">
                            {(() => {
                              const services = servicesByCategory[selectedMassageType] || [];
                              // Sort by duration length
                              const sortedServices = [...services].sort((a, b) => a.minutes - b.minutes);

                              return sortedServices.map((service) => {
                                const mins = service.minutes;
                                const isSelected = selectedMassageMinutes === mins;
                                const price = service.priceCents / 100;

                                return (
                                  <button
                                    key={service.name}
                                    type="button"
                                    onClick={() => {
                                      setSelectedMassageMinutes(mins);
                                      setSelectedTherapyService(null);
                                    }}
                                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                                      isSelected
                                        ? "border-zinc-900 bg-zinc-900 text-white shadow-md"
                                        : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400"
                                    }`}
                                    style={{ minWidth: '100px' }}
                                  >
                                    <span className="font-bold text-lg">{mins} <span className="text-sm font-normal opacity-80">min</span></span>
                                    <span className={`text-xs mt-1 ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>
                                      ${price}
                                    </span>
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Therapy Selection */}
                  {(activeServiceTab === "therapy" || isDesktop) && (
                    <div
                      ref={therapySectionRef}
                      className={`space-y-4 pt-4 md:pt-6 md:border-t border-zinc-200 transition-opacity ${selectedMassageType ? 'opacity-40' : ''}`}
                    >
                      <h4 className="text-sm font-semibold text-zinc-700 md:block hidden">
                        Other Therapies
                      </h4>

                      {selectedMassageType && (
                        <div className="flex items-center justify-between gap-3 bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                          <p className="text-xs text-zinc-700 flex-1">
                            Massage service selected.
                          </p>
                          <button
                            type="button"
                            onClick={switchToTherapy}
                            className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-800 transition"
                            aria-label="Switch to therapy services"
                          >
                            Switch to Therapies
                          </button>
                        </div>
                      )}

                      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                        {(() => {
                          const therapies = Object.keys(servicesByCategory)
                            .filter(cat => cat !== "Massage" && cat !== "Specialized Therapy" && !massageTypes.find(m => m.category === cat))
                            .flatMap(cat => servicesByCategory[cat])
                            .sort((a, b) => a.priceCents - b.priceCents);

                          return therapies.map((service) => {
                            const isSelected = selectedTherapyService === service.name;
                            const price = service.priceCents / 100;

                            return (
                              <button
                                key={service.name}
                                type="button"
                                onClick={() => {
                                  setSelectedMassageType(null);
                                  setSelectedMassageMinutes(null);
                                  setSelectedTherapyService(service.name);
                                }}
                                className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                                  isSelected
                                    ? "border-zinc-900 bg-zinc-50"
                                    : "border-zinc-200 bg-white hover:border-zinc-400"
                                }`}
                              >
                                {isSelected && (
                                  <div className="absolute top-3 right-3">
                                    <div className="bg-zinc-900 rounded-full p-1">
                                      <Check className="h-4 w-4 text-white" />
                                    </div>
                                  </div>
                                )}
                                <div className="pr-8">
                                  <div className="flex justify-between items-start gap-2 mb-1">
                                    <div className="font-semibold text-sm text-zinc-900">
                                      {service.name}
                                    </div>
                                    <div className="font-medium text-sm text-zinc-900 whitespace-nowrap">
                                      ${price}
                                    </div>
                                  </div>
                                  {service.description && (
                                    <p className="text-xs text-zinc-500 line-clamp-2">{service.description}</p>
                                  )}
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>
                          type="button"
                          onClick={() => {
                            setSelectedTherapyService(service.name);
                            setSelectedMassageType(null);
                            setSelectedMassageMinutes(null);
                          }}
                          className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                            isSelected
                              ? "border-zinc-900 bg-zinc-50"
                              : "border-zinc-200 bg-white hover:border-zinc-400"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-3 right-3">
                              <div className="bg-zinc-900 rounded-full p-1">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          )}
                          <div className="pr-8">
                            <h5 className="font-semibold text-sm text-zinc-900 mb-1">
                              {service.name}
                            </h5>
                            <div className="flex items-center gap-2 text-xs text-zinc-600">
                              <span>{service.minutes} min</span>
                              <span>•</span>
                              <span className="font-medium text-zinc-900">
                                {price > 0 ? `CA$${price}` : "Custom pricing"}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Other Services */}
              {servicesByCategory.other && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-zinc-700">
                    {CATEGORY_LABELS.other}
                  </h4>
                  <div className="grid gap-3">
                    {servicesByCategory.other.map((service) => {
                      const isSelected = selectedTherapyService === service.name;
                      const price = service.priceCents / 100;

                      return (
                        <button
                          key={service.name}
                          type="button"
                          onClick={() => {
                            setSelectedTherapyService(service.name);
                            setSelectedMassageType(null);
                            setSelectedMassageMinutes(null);
                          }}
                          className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                            isSelected
                              ? "border-zinc-900 bg-zinc-50"
                              : "border-zinc-200 bg-white hover:border-zinc-400"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-3 right-3">
                              <div className="bg-zinc-900 rounded-full p-1">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          )}
                          <div className="pr-8">
                            <h5 className="font-semibold text-sm text-zinc-900 mb-1">
                              {service.name}
                            </h5>
                            <div className="text-xs text-zinc-600">
                              {price > 0 ? `CA$${price}` : "Inquiry only"}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Date & Time Selection */}
          {currentStep === 2 && (
            <div className="grid sm:grid-cols-2 gap-4 min-w-0 w-full overflow-hidden">
            <div className="min-w-0 w-full overflow-hidden">
              <label className="block text-sm mb-1" htmlFor="booking-date">
                Date
              </label>
              <input
                id="booking-date"
                type="date"
                value={form.date}
                min={todayDate}
                lang="en-CA"
                placeholder="YYYY-MM-DD"
                onChange={(e) => handleFieldChange("date", e.target.value)}
                onBlur={() => markTouched("date")}
                required
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
                aria-invalid={Boolean(showFieldError("date"))}
                aria-describedby={
                  showFieldError("date") ? "booking-date-error" : undefined
                }
              />
              {showFieldError("date") && (
                <p
                  id="booking-date-error"
                  className="mt-1 text-sm text-red-600"
                >
                  {showFieldError("date")}
                </p>
              )}
            </div>
            <div className="min-w-0 w-full overflow-hidden">
              <label className="block text-sm mb-1" htmlFor="booking-time">
                Time
              </label>
              <select
                id="booking-time"
                value={form.time}
                onChange={(e) => handleFieldChange("time", e.target.value)}
                onBlur={() => markTouched("time")}
                required
                className="w-full max-w-full box-border rounded-md border border-zinc-200 px-3 py-2"
                aria-invalid={Boolean(showFieldError("time"))}
                aria-describedby={
                  showFieldError("time") ? "booking-time-error" : undefined
                }
              >
                <option value="">Select time</option>
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              {showFieldError("time") && (
                <p
                  id="booking-time-error"
                  className="mt-1 text-sm text-red-600"
                >
                  {showFieldError("time")}
                </p>
              )}
              {hasDateTime && isDatetimeInPast() && (
                <p className="mt-1 text-sm text-red-600">
                  Cannot book in the past. Please select a future date and time.
                </p>
              )}
            </div>

            {/* Time availability error and suggestions */}
            {timeError && (
              <div className="sm:col-span-2 mt-2 min-w-0">
                <div className="bg-white border border-zinc-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-zinc-900 mb-2">{timeError}</p>

                  {suggestedTimes.length > 0 && (
                    <div>
                      <p className="text-sm text-zinc-600 mb-3">
                        Try these nearby times:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedTimes.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => {
                              handleFieldChange("time", time);
                              setTimeError(null);
                              setSuggestedTimes([]);
                            }}
                            className="border border-zinc-200 rounded-full px-3 py-1 text-sm hover:bg-zinc-50 transition-colors"
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Real-time availability notice */}
            {!timeError && hasDateTime && (
              <div className="sm:col-span-2 mt-2">
                <p className="text-xs text-zinc-600 italic">
                  Availability updates in real time. If a slot is taken, please pick another time.
                </p>
              </div>
            )}
            </div>
          )}

          {/* Step 3: Details */}
          {currentStep === 3 && (
            <>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" htmlFor="booking-name">
                Your Name
              </label>
              <input
                id="booking-name"
                value={form.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                onBlur={() => markTouched("name")}
                required
                className="w-full rounded-md border px-3 py-2"
                autoComplete="name"
                aria-invalid={Boolean(showFieldError("name"))}
                aria-describedby={
                  showFieldError("name") ? "booking-name-error" : undefined
                }
              />
              {showFieldError("name") && (
                <p
                  id="booking-name-error"
                  className="mt-1 text-sm text-red-600"
                >
                  {showFieldError("name")}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1" htmlFor="booking-email">
                Email
              </label>
              <input
                id="booking-email"
                type="email"
                value={form.email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                onBlur={() => markTouched("email")}
                required
                className="w-full rounded-md border px-3 py-2"
                autoComplete="email"
                inputMode="email"
                aria-invalid={Boolean(showFieldError("email"))}
                aria-describedby={
                  showFieldError("email") ? "booking-email-error" : undefined
                }
              />
              {showFieldError("email") && (
                <p
                  id="booking-email-error"
                  className="mt-1 text-sm text-red-600"
                >
                  {showFieldError("email")}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1" htmlFor="booking-phone">
              Phone
            </label>
            <input
              id="booking-phone"
              value={form.phone}
              onChange={(e) => handleFieldChange("phone", e.target.value)}
              onBlur={() => markTouched("phone")}
              required
              className="w-full rounded-md border px-3 py-2"
              autoComplete="tel"
              inputMode="tel"
              aria-invalid={Boolean(showFieldError("phone"))}
              aria-describedby={
                showFieldError("phone") ? "booking-phone-error" : undefined
              }
            />
            {showFieldError("phone") && (
              <p id="booking-phone-error" className="mt-1 text-sm text-red-600">
                {showFieldError("phone")}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1" htmlFor="booking-notes">
              Notes (optional)
            </label>
            <textarea
              id="booking-notes"
              rows={3}
              value={form.notes || ""}
              onChange={(e) => handleFieldChange("notes", e.target.value)}
              onBlur={() => markTouched("notes")}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          {/* Add-ons Section - only show for massage services */}
          {isMassageService && (
            <div className="border-t border-zinc-200 pt-4">
              {selectedMinutes >= 60 ? (
                // 60/90-min massage: Show package CTA instead of add-ons
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm text-zinc-700 mb-3">
                    Complimentary sauna/hot tub is available with packages.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/sign-up"
                      className="inline-flex items-center px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition"
                    >
                      Create an account to purchase packages
                    </Link>
                    <Link
                      href="/holiday-packages"
                      className="inline-flex items-center px-4 py-2 border border-zinc-900 text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-100 transition"
                    >
                      View packages
                    </Link>
                  </div>
                </div>
              ) : (
                // 45-min massage: Show paid add-ons
                <>
                  <h3 className="text-sm font-semibold text-zinc-900 mb-2">
                    Optional Add-ons
                  </h3>
                  <p className="text-xs text-zinc-600 mb-3">
                    CA$45 per 30-min session
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-zinc-200 hover:border-zinc-400 transition cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAddons.includes("sauna")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAddons([...selectedAddons, "sauna"]);
                          } else {
                            setSelectedAddons(
                              selectedAddons.filter((a) => a !== "sauna"),
                            );
                          }
                        }}
                        className="w-4 h-4 text-zinc-900 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-900">
                            Sauna Session
                          </span>
                          <span className="text-xs text-zinc-500">CA$45</span>
                        </div>
                        <p className="text-xs text-zinc-600">
                          30 min · Relaxing sauna session
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-zinc-200 hover:border-zinc-400 transition cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAddons.includes("hot_tub")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAddons([...selectedAddons, "hot_tub"]);
                          } else {
                            setSelectedAddons(
                              selectedAddons.filter((a) => a !== "hot_tub"),
                            );
                          }
                        }}
                        className="w-4 h-4 text-zinc-900 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-900">
                            Hot Tub Session
                          </span>
                          <span className="text-xs text-zinc-500">CA$45</span>
                        </div>
                        <p className="text-xs text-zinc-600">
                          30 min · Soothing hot tub session
                        </p>
                      </div>
                    </label>
                  </div>
                  <div className="mt-3 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                    <p className="text-xs text-zinc-700 mb-2">
                      💡 Upgrade to 60 min for complimentary add-on with packages
                    </p>
                    <Link
                      href="/holiday-packages"
                      className="inline-flex items-center text-xs font-medium text-zinc-900 hover:underline"
                    >
                      View Packages →
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Offer Summary */}
          {selectedOfferCode && (
            <div className="border-2 border-purple-200 bg-purple-50 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-purple-900">
                    🎁 Offer Applied: {selectedOfferCode}
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    This offer will be included with your booking
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOfferCode(null);
                    try {
                      localStorage.removeItem("christmas_offer_selected");
                    } catch (e) {}
                    toast.success("Offer removed");
                  }}
                  className="text-purple-600 hover:text-purple-800 text-sm ml-2"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
            </>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border-2 border-zinc-200 p-6">
                <h3 className="text-lg font-semibold text-zinc-900 mb-4">
                  Review Your Booking
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-zinc-700">Service:</span>{" "}
                    <span className="text-zinc-900">{form.service}</span>
                  </div>
                  <div>
                    <span className="font-medium text-zinc-700">Date & Time:</span>{" "}
                    <span className="text-zinc-900">
                      {new Date(form.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      at {form.time}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-zinc-700">Name:</span>{" "}
                    <span className="text-zinc-900">{form.name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-zinc-700">Email:</span>{" "}
                    <span className="text-zinc-900">{form.email}</span>
                  </div>
                  <div>
                    <span className="font-medium text-zinc-700">Phone:</span>{" "}
                    <span className="text-zinc-900">{form.phone}</span>
                  </div>
                  {form.notes && (
                    <div>
                      <span className="font-medium text-zinc-700">Notes:</span>{" "}
                      <span className="text-zinc-900">{form.notes}</span>
                    </div>
                  )}
                  {selectedAddons.length > 0 && (
                    <div>
                      <span className="font-medium text-zinc-700">Add-ons:</span>{" "}
                      <span className="text-zinc-900">{selectedAddons.map(a => `➕ ${a}`).join(", ")}</span>
                    </div>
                  )}
                  {selectedOfferCode && (
                    <div>
                      <span className="font-medium text-zinc-700">Offer:</span>{" "}
                      <span className="text-purple-900 font-medium">🎁 {selectedOfferCode}</span>
                    </div>
                  )}
                </div>

                {/* Hint for 60/90-min massage about packages */}
                {isMassageService && selectedMinutes >= 60 && (
                  <div className="mt-3 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                    <p className="text-xs text-zinc-500">
                      Want sauna/hot tub included? Packages require an account.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Link
                        href="/sign-up"
                        className="text-xs font-medium text-zinc-900 hover:underline"
                      >
                        Create account →
                      </Link>
                      <Link
                        href="/holiday-packages"
                        className="text-xs font-medium text-zinc-900 hover:underline"
                      >
                        View packages →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <button className="btn btn-primary w-full" disabled={loading}>
                {loading ? "Submitting..." : submitLabel}
              </button>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep < 4 && (
            <div className="flex gap-4">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-900 rounded-lg font-medium transition"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceedFromStep(currentStep) || (currentStep === 2 && checkingTime)}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
              >
                {currentStep === 2 && checkingTime ? "Checking availability…" : "Next"}
              </button>
            </div>
          )}

          {/* Success Card */}
          {ok && (
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-green-900">
                    Success!
                  </h3>
                  <p className="mt-1 text-sm text-green-700">{ok}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Card */}
          {err && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-900">
                    {err === "time_taken"
                      ? "Time Slot Unavailable"
                      : "Booking Error"}
                  </h3>
                  <p className="mt-1 text-sm text-red-700">
                    {err === "time_taken"
                      ? "Someone just booked this time. Please choose another slot."
                      : err}
                  </p>
                  <button
                    onClick={() => setErr(null)}
                    className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
                  >
                    Choose Another Time
                  </button>
                </div>
              </div>
            </div>
          )}

          <small>
            By booking, you acknowledge these are wellness sessions, not medical
            treatment.
          </small>
        </form>

        {/* Right Column: Summary Sidebar (Desktop) */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-zinc-200 p-6">
              <h3 className="text-lg font-semibold text-zinc-900 mb-4">
                Booking Summary
              </h3>

              <div className="space-y-4">
                {/* Service */}
                <div>
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Service
                  </label>
                  <p className="text-sm text-zinc-900 mt-1">
                    {form.service || "Not selected"}
                  </p>
                </div>

                {/* Date & Time */}
                {hasDateTime && (
                  <div>
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      Date & Time
                    </label>
                    <p className="text-sm text-zinc-900 mt-1">
                      {new Date(form.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      at {form.time}
                    </p>
                  </div>
                )}

                {/* Add-ons */}
                {selectedAddons.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      Add-ons
                    </label>
                    <div className="mt-1 space-y-1">
                      {selectedAddons.map((addon) => (
                        <div
                          key={addon}
                          className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg"
                        >
                          <p className="text-sm text-zinc-900">➕ {addon}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Offer */}
                {selectedOfferCode && (
                  <div>
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      Special Offer
                    </label>
                    <div className="mt-1 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm font-medium text-purple-900">
                        🎁 {selectedOfferCode}
                      </p>
                    </div>
                  </div>
                )}

                {/* Customer Info */}
                {hasCustomerInfo && (
                  <div className="pt-4 border-t">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      Contact
                    </label>
                    <div className="mt-1 text-sm text-zinc-900 space-y-1">
                      <p>{form.name}</p>
                      <p className="text-zinc-600">{form.email}</p>
                      <p className="text-zinc-600">{form.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Summary (Collapsible) */}
      <div className="lg:hidden mt-6">
        <button
          type="button"
          onClick={() => setShowSummary(!showSummary)}
          className="w-full px-4 py-3 bg-white rounded-2xl shadow border-2 border-zinc-200 flex items-center justify-between"
        >
          <span className="text-sm font-semibold text-zinc-900">
            View Booking Summary
          </span>
          <svg
            className={`w-5 h-5 text-zinc-600 transition-transform ${
              showSummary ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {showSummary && (
          <div className="mt-3 bg-white rounded-2xl shadow border-2 border-zinc-200 p-4">
            <h3 className="text-base font-semibold text-zinc-900 mb-3">
              Booking Summary
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase">
                  Service
                </label>
                <p className="text-zinc-900 mt-1">{form.service}</p>
              </div>

              {hasDateTime && (
                <div>
                  <label className="text-xs font-medium text-zinc-500 uppercase">
                    Date & Time
                  </label>
                  <p className="text-zinc-900 mt-1">
                    {new Date(form.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    at {form.time}
                  </p>
                </div>
              )}

              {selectedAddons.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-zinc-500 uppercase">
                    Add-ons
                  </label>
                  <div className="mt-1 space-y-1">
                    {selectedAddons.map((addon) => (
                      <p key={addon} className="text-zinc-900">
                        ➕ {addon}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {selectedOfferCode && (
                <div>
                  <label className="text-xs font-medium text-zinc-500 uppercase">
                    Offer
                  </label>
                  <p className="text-sm font-medium text-purple-900 mt-1">
                    🎁 {selectedOfferCode}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
