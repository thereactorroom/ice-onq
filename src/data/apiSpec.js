// API specification data for the non-iframe ICE QR verification flow.
// Examples are based on the current implementation. Where fusion onQ's own
// response shape is passed through verbatim and not fully specified upstream,
// the example is marked "illustrative".

export const specMeta = {
  title: "ICE onQ Verification API",
  version: "1.0",
  updated: "24 November 2026",
  scope:
    "QR verification, fusion onQ sign-up and sign-in, ICE profile discovery and QR linking when the app is opened outside the fusiononq.com iframe.",
  publishedUrl: "https://ice-onq-app.base44.app",
};

export const flow = [
  {
    step: 1,
    title: "Resolve the scanned QR code",
    detail:
      "The scanned token is looked up as a founding token on an ICE profile, then as a linked alias. A linked profile opens read-only; an unlinked or invalid token starts the claim flow.",
    endpoints: ["manageQRCode"],
  },
  {
    step: 2,
    title: "Verify the mobile number",
    detail:
      "The visitor enters a mobile number. fusion onQ reports whether that number belongs to an existing fusion user and whether a password is set.",
    endpoints: ["fusionUserCheck"],
  },
  {
    step: 3,
    title: "Authenticate the visitor",
    detail:
      "Existing users sign in with their fusion onQ password. Users without a password, and unknown numbers, receive an SMS one-time code. An unknown number is registered on fusion onQ after the code is verified.",
    endpoints: ["fusionSignIn", "fusionSendOtp", "fusionVerifyOtp", "fusionRegister"],
  },
  {
    step: 4,
    title: "Discover the visitor's ICE profiles",
    detail:
      "The fusion userId becomes the ICE identity (fID). The app checks for a personal profile, collects dependent and shared profiles, and creates a personal profile shell only when none exists.",
    endpoints: ["checkProfileExists", "getGuardianInvites", "getPublicICEProfile"],
  },
  {
    step: 5,
    title: "Link the QR code",
    detail:
      "The visitor confirms which profile the QR code should open. A token can be bound to exactly one profile; a token already owned elsewhere is reported as claimed.",
    endpoints: ["manageQRCode"],
  },
];

export const conventions = [
  {
    title: "Transport",
    body: "Every Base44 function accepts a POST with a JSON body and replies with JSON. From inside the app, call it with base44.functions.invoke(name, payload) and read res.data; never build an absolute URL in app code.",
  },
  {
    title: "Two response patterns",
    body: "Proxy functions return the fusion onQ body unchanged, so business failures arrive as HTTP 200 with { result: false, reason }. The app's own functions use { error } with a 4xx or 5xx status.",
  },
  {
    title: "Mobile number formats",
    body: "fusionUserCheck, fusionSendOtp, fusionSignIn and fusionRegister send a local number with a leading zero plus countryCode 27. fusionVerifyOtp and invite matching use E.164 digits with no plus sign. The proxies normalise whatever the caller sends.",
  },
  {
    title: "Identity",
    body: "A fusion onQ user is identified by userId. That same value is stored as fusion_id on an ICE profile and is referred to as the fID throughout the app.",
  },
  {
    title: "Credentials",
    body: "The fusion onQ API key (FUSION_API_KEY) lives only on the server and is attached by the proxy functions. No client ever holds it, and there is no per-user token.",
  },
];

export const httpExample = {
  curl: `curl -X POST "https://ice-onq-app.base44.app/functions/fusionUserCheck" \\
  -H "Content-Type: application/json" \\
  -d '{"mobile": "+27 82 000 0000"}'`,
  sdk: `const { data } = await base44.functions.invoke("fusionUserCheck", {
  mobile: "+27 82 000 0000",
});`,
};

export const upstream = {
  url: "https://app.fusiononq.com/api/",
  transport:
    "POST with Content-Type: application/x-www-form-urlencoded and an apiKey header. The proxies add the key; callers never see it.",
  actions: [
    { action: "userCheck", sentBy: "fusionUserCheck", fields: "userId, countryCode, action" },
    { action: "sendOTP", sentBy: "fusionSendOtp", fields: "mobile, countryCode, action" },
    { action: "signin", sentBy: "fusionSignIn", fields: "countryCode, identifier, password, action" },
    { action: "verifyOTP", sentBy: "fusionVerifyOtp", fields: "userId, code, action, signin (only when true)" },
    {
      action: "signup",
      sentBy: "fusionRegister",
      fields: "name, surname, password, communityCode (empty), mobile, countryName, countryCode, action",
    },
  ],
  example: {
    request: `POST https://app.fusiononq.com/api/
Content-Type: application/x-www-form-urlencoded
apiKey: <server-side secret>

userId=0820000000&countryCode=27&action=userCheck`,
    response: {
      result: true,
      user: {
        userId: 1305,
        name: "Joe",
        surname: "Soap",
        hasPassword: "true",
        dob: "1988-04-12",
        picture: "/uploads/avatar-1305.jpg",
      },
    },
  },
};

export const endpoints = [
  {
    id: "manageQRCode",
    name: "manageQRCode",
    method: "POST",
    path: "/functions/manageQRCode",
    summary:
      "Single entry point for QR token lookups and bindings. The claim flow uses the resolve and link actions.",
    auth:
      "resolve is public. link, list, update and unlink require an authorised caller: a fusionUserId matching the profile's fusion_id or guardian_fid, a ProfileGuardian record for that user, or a signed-in Base44 admin or the profile's creator.",
    actions: [
      { action: "resolve", auth: "Public", purpose: "Look up a token without linking it." },
      { action: "link", auth: "Authorised", purpose: "Bind a token to one profile." },
      { action: "list", auth: "Authorised", purpose: "Founding token plus all aliases for a profile." },
      { action: "update", auth: "Authorised", purpose: "Rename a linked alias." },
      { action: "unlink", auth: "Authorised", purpose: "Delete an alias; the founding token is never stored here." },
    ],
    requests: [
      {
        label: "Resolve a scanned token",
        code: { action: "resolve", qrToken: "q7f3k9m2x4b8" },
      },
      {
        label: "Link a token to the chosen profile",
        code: {
          action: "link",
          qrToken: "q7f3k9m2x4b8",
          profileId: "68f1c0a2e4b0a12c34d5e6f7",
          linkName: "Helmet",
          fusionUserId: "1305",
        },
      },
    ],
    responses: [
      {
        label: "Resolved to an active profile",
        status: 200,
        code: {
          status: "linked",
          profileId: "68f1c0a2e4b0a12c34d5e6f7",
          fusionId: "1305",
          isFounding: true,
          displayName: "Joe Soap",
        },
      },
      {
        label: "Token is not bound to anything",
        status: 200,
        code: { status: "unlinked" },
      },
      {
        label: "Token is malformed or empty",
        status: 200,
        code: { status: "invalid" },
      },
      {
        label: "Link created",
        status: 200,
        code: {
          status: "linked",
          code: {
            id: "68f1c1b9e4b0a12c34d5e701",
            qr_token: "q7f3k9m2x4b8",
            profile_id: "68f1c0a2e4b0a12c34d5e6f7",
            link_name: "Helmet",
            linked_at: "2026-11-24T09:15:00.000Z",
            linked_by: "1305",
          },
        },
      },
      {
        label: "Token already bound to the same profile",
        status: 200,
        code: { status: "already_linked" },
      },
      {
        label: "Token owned by a different profile",
        status: 200,
        code: {
          status: "claimed",
          ownerProfileId: "68f0aa11e4b0a12c34d5e1aa",
          ownerName: "Demo Person",
          linkType: "founding",
          linkName: "Primary ICE QR Code",
        },
      },
    ],
    errors: [
      { status: 400, code: { error: "qrToken and profileId required" } },
      { status: 403, code: { error: "Not authorized to link QR codes for this profile" } },
      { status: 404, code: { error: "Profile not found" } },
      { status: 400, code: { error: "Invalid action" } },
    ],
    notes: [
      "Resolve checks the profile's founding qr_token first, then the LinkedQRCode alias table. Soft-deleted profiles are treated as unlinked.",
      "A token can belong to only one profile. Founding tokens are claimed first, then aliases.",
      "A successful link calls the QR generator callback in the background (bind), and unlink sends unbind. A callback failure never fails the request.",
    ],
  },
  {
    id: "fusionUserCheck",
    name: "fusionUserCheck",
    method: "POST",
    path: "/functions/fusionUserCheck",
    summary:
      "Checks whether a mobile number belongs to an existing fusion onQ user and whether that account has a password. Decides the next step of the claim flow.",
    auth: "Public. No session or token is required.",
    requests: [
      { label: "Any accepted South African format", code: { mobile: "+27 82 000 0000" } },
      { label: "Local format", code: { mobile: "082 000 0000" } },
    ],
    responses: [
      {
        label: "User exists with a password — show the password step",
        status: 200,
        illustrative: true,
        code: {
          result: true,
          user: {
            userId: 1305,
            name: "Joe",
            surname: "Soap",
            hasPassword: "true",
            dob: "1988-04-12",
            picture: "/uploads/avatar-1305.jpg",
          },
        },
      },
      {
        label: "User exists without a password — send an SMS code",
        status: 200,
        illustrative: true,
        code: { result: true, user: { userId: 1305, name: "Joe", hasPassword: "false" } },
      },
      {
        label: "Number is not on fusion onQ — send an SMS code, then register",
        status: 200,
        illustrative: true,
        code: { result: false, reason: "User not found" },
      },
    ],
    errors: [{ status: 400, code: { error: "mobile required" } }],
    notes: [
      "The response body is fusion onQ's own payload, passed through unchanged.",
      "The client treats the number as existing only when both result and user are present, and reads hasPassword as a string.",
      "Normalisation: +27720980200, 27720980200 and 0720980200 all become userId=0720980200 with countryCode=27.",
    ],
  },
  {
    id: "fusionSignIn",
    name: "fusionSignIn",
    method: "POST",
    path: "/functions/fusionSignIn",
    summary:
      "Verifies a fusion onQ password for a number that has one. Used only on the password branch of the claim flow.",
    auth: "Public.",
    requests: [{ label: "Password sign-in", code: { mobile: "0820000000", password: "correct-horse" } }],
    responses: [
      {
        label: "Password accepted",
        status: 200,
        illustrative: true,
        code: {
          result: true,
          reason: "Signed in",
          user: { userId: 1305, name: "Joe", surname: "Soap", dob: "1988-04-12" },
        },
      },
      {
        label: "Password rejected",
        status: 200,
        illustrative: true,
        code: { result: false, reason: "Invalid password" },
      },
    ],
    errors: [{ status: 400, code: { error: "mobile and password required" } }],
    notes: [
      "The number is sent as identifier in local format with countryCode 27.",
      "A successful response returns the fusion user, which the flow uses as the fID.",
    ],
  },
  {
    id: "fusionSendOtp",
    name: "fusionSendOtp",
    method: "POST",
    path: "/functions/fusionSendOtp",
    summary:
      "Requests an SMS one-time code. Used when the number has no fusion onQ password, and for numbers that are not registered yet.",
    auth: "Public.",
    requests: [{ label: "Request a code", code: { mobile: "+27 82 000 0000" } }],
    responses: [
      {
        label: "Code sent",
        status: 200,
        illustrative: true,
        code: { result: true, reason: "OTP has been sent." },
      },
      {
        label: "Daily limit reached",
        status: 200,
        illustrative: true,
        code: {
          result: false,
          reason: "You've reached your daily OTP limit. Please try again in 24 hours.",
        },
      },
    ],
    errors: [{ status: 400, code: { error: "mobile required" } }],
    notes: [
      "fusion onQ limits OTP sends to three per mobile number in a 24-hour period; the reason string is shown to the visitor.",
      "Sent with mobile= (local format) and countryCode=27, unlike verifyOTP which uses userId.",
    ],
  },
  {
    id: "fusionVerifyOtp",
    name: "fusionVerifyOtp",
    method: "POST",
    path: "/functions/fusionVerifyOtp",
    summary:
      "Validates the SMS code. The signin flag tells fusion onQ whether the number already has an account.",
    auth: "Public.",
    requests: [
      { label: "Existing fusion user signing in", code: { mobile: "0820000000", code: "123456", signin: true } },
      { label: "New number, before registration", code: { mobile: "0820000000", code: "123456", signin: false } },
    ],
    responses: [
      {
        label: "Code accepted",
        status: 200,
        illustrative: true,
        code: { result: true, reason: "Valid OTP code", token: "otp-session-token" },
      },
      {
        label: "Code rejected",
        status: 200,
        illustrative: true,
        code: { result: false, reason: "Invalid OTP code" },
      },
    ],
    errors: [{ status: 400, code: { error: "mobile and code required" } }],
    notes: [
      "The number is normalised to E.164 digits (27820000000) and sent as userId, while the code is stripped to digits only.",
      "signin=true is added to the upstream form only when the caller asks for it. For fresh signups the caller passes signin=false and the field is omitted.",
      "The upstream token is returned but the app does not exchange it for a session; the flow continues with the fusion user it already has.",
    ],
  },
  {
    id: "fusionRegister",
    name: "fusionRegister",
    method: "POST",
    path: "/functions/fusionRegister",
    summary:
      "Creates a fusion onQ account for a number that was just verified by SMS code. Called from the registration step of the claim flow.",
    auth: "Public. The caller is expected to have verified the number first, but the endpoint does not enforce that itself.",
    requests: [
      {
        label: "Register after OTP verification",
        code: { mobile: "0720000302", name: "Joe", surname: "Soap", password: "correct-horse" },
      },
    ],
    responses: [
      {
        label: "Account created",
        status: 200,
        illustrative: true,
        code: {
          result: true,
          reason: "User registered successfully",
          user: { userId: 1320, name: "Joe", surname: "Soap", hasPassword: "true" },
        },
      },
      {
        label: "Registration refused",
        status: 200,
        illustrative: true,
        code: { result: false, reason: "This number is already registered." },
      },
    ],
    errors: [
      { status: 400, code: { error: "name, surname, password and mobile required" } },
    ],
    notes: [
      "countryName is fixed to South Africa, countryCode to 27, and communityCode is sent empty.",
      "Registration does not return an app session. The claim flow continues with the returned fusion user and does not call fusionSignIn again.",
    ],
  },
  {
    id: "checkProfileExists",
    name: "checkProfileExists",
    method: "POST",
    path: "/functions/checkProfileExists",
    summary:
      "Fast existence check for an ICE profile belonging to a fusion identity. Used to decide whether to create a profile shell.",
    auth: "Public. Runs with service role.",
    requests: [
      { label: "JSON body", code: { id: "1305" } },
      { label: "Query string alternative", code: "GET /functions/checkProfileExists?id=1305" },
    ],
    responses: [
      { label: "Profile exists", status: 200, code: { exists: true } },
      { label: "Served from the in-memory cache", status: 200, code: { exists: true, cached: true } },
      { label: "No active profile", status: 200, code: { exists: false } },
    ],
    errors: [{ status: 400, code: { error: 'Parameter "id" (fusion_id) is required' } }],
    notes: [
      "Soft-deleted profiles (is_deleted: true) are excluded, so a deleted profile reads as non-existent.",
      "Results are cached in memory for 60 seconds per fusion id, which means a profile created moments ago may still report exists: false.",
    ],
  },
  {
    id: "getGuardianInvites",
    name: "getGuardianInvites",
    method: "POST",
    path: "/functions/getGuardianInvites",
    summary:
      "Returns the pending guardian invitations, dependent profiles and co-guardianship profiles for an identity. The claim flow uses it to build the list of profiles a QR code can be linked to.",
    auth: "Public. Runs with service role.",
    requests: [
      { label: "By fusion identity", code: { fusionId: "1305" } },
      {
        label: "With email and mobile for invite matching",
        code: { fusionId: "1305", email: "joe@example.com", mobile: "0820000000" },
      },
      {
        label: "For one dependent's guardian panel",
        code: { fusionId: "1305", dependentProfileId: "68f1c0a2e4b0a12c34d5e6f7" },
      },
    ],
    responses: [
      {
        label: "Populated result",
        status: 200,
        code: {
          pendingInvites: [
            {
              id: "68f1c2d4e4b0a12c34d5e710",
              dependent_name: "Mia Soap",
              inviter_name: "Joe Soap",
              status: "pending",
              token: "inv_9f2c",
            },
          ],
          dependentProfiles: [
            {
              id: "68f1c0a2e4b0a12c34d5e6f7",
              fusion_id: "1310",
              guardian_fid: "1305",
              display_name: "Mia Soap",
              dependent_relationship: "Daughter",
            },
          ],
          sharedProfiles: [
            {
              id: "68f0aa11e4b0a12c34d5e1aa",
              fusion_id: "1290",
              display_name: "Demo Person",
              _guardianship: { guardian_fusion_id: "1305", relationship: "Spouse" },
            },
          ],
          dependentGuardians: [],
          dependentInvites: [],
        },
      },
      {
        label: "Nothing found",
        status: 200,
        code: { pendingInvites: [], dependentProfiles: [], sharedProfiles: [], dependentGuardians: [], dependentInvites: [] },
      },
    ],
    errors: [],
    notes: [
      "dependentProfiles matches guardian_fid and excludes soft-deleted records.",
      "sharedProfiles comes from ProfileGuardian rows for the fusion id, each joined to its profile.",
      "Invites are matched by lower-cased email and by E.164 mobile, then de-duplicated by id.",
    ],
  },
  {
    id: "getPublicICEProfile",
    name: "getPublicICEProfile",
    method: "POST",
    path: "/functions/getPublicICEProfile",
    summary:
      "Loads a profile with its contacts and health records. Also creates a personal profile shell when a fusion identity has none, which is the last step before linking.",
    auth:
      "Public read. Runs with service role. Auto-creation is allowed only when the supplied fusionUser.userId equals the requested profile id.",
    requests: [
      {
        label: "Create or load the visitor's own profile",
        code: {
          profileId: "1305",
          fusionUser: {
            userId: "1305",
            name: "Joe",
            surname: "Soap",
            dob: "1988-04-12",
            picture: "/uploads/avatar-1305.jpg",
          },
          fusionHost: "https://app.fusiononq.com",
        },
      },
      {
        label: "Load by database id after resolving a QR token",
        code: { profileId: "68f1c0a2e4b0a12c34d5e6f7", isDbId: true },
      },
      { label: "Load by public share slug", code: { profileId: "0", slug: "aB3xY9kLmN2p" } },
    ],
    responses: [
      {
        label: "Profile loaded",
        status: 200,
        code: {
          profile: {
            id: "68f1c0a2e4b0a12c34d5e6f7",
            fusion_id: "1305",
            public_slug: "aB3xY9kLmN2p",
            display_name: "Joe Soap",
            blood_group: "O+",
            date_of_birth: "1988-04-12",
            profile_photo: "https://app.fusiononq.com/uploads/avatar-1305.jpg",
            pre_login_enabled: true,
            is_deleted: false,
          },
          profileDbId: "68f1c0a2e4b0a12c34d5e6f7",
          isOwner: true,
          contacts: [],
          allergies: [],
          conditions: [],
          medications: [],
          user: { full_name: "Joe Soap" },
        },
      },
      {
        label: "No profile for this identity",
        status: 200,
        code: {
          profile: null,
          profileDbId: null,
          contacts: [],
          allergies: [],
          conditions: [],
          medications: [],
          user: { full_name: "Unknown" },
          notFound: true,
        },
      },
    ],
    errors: [],
    notes: [
      "profileId 0 or empty serves the demo profile; the demo is never created.",
      "A slug lookup takes priority over the id, and is always read-only.",
      "Soft-deleted profiles count as non-existent.",
      "When several records share a fusion_id, the one with the most data is kept and the rest are deleted as a side effect.",
      "A shell is created only for the session's own fID, needs a display name, and is seeded with fusion name, date of birth, a generated public_slug, pre_login_enabled: true and the fusion photo when a host is supplied.",
    ],
  },
];

export const limitations = [
  "The claim flow is unauthenticated at the app level: identity comes from fusion onQ verification, and no Base44 session is created. Authorisation on manageQRCode therefore relies on the fusionUserId the client sends, checked against fusion_id, guardian_fid or a ProfileGuardian record.",
  "Registration does not sign the user in again, and the upstream OTP token is not exchanged for a session.",
  "fusionSendOtp sends the number as a local mobile while fusionVerifyOtp sends E.164 userId, matching the upstream contract but easy to get wrong when integrating directly.",
  "checkProfileExists caches for 60 seconds, so a freshly created profile can briefly report as missing.",
  "getPublicICEProfile deletes duplicate records for the same fusion_id during a read, which is destructive behaviour on a GET-like call.",
  "OTP delivery is capped at three per number per 24 hours by fusion onQ.",
];