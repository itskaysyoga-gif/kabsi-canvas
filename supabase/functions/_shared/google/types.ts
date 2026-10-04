// Shared types for the Google layer. "Wire" types follow Google's documented response bodies (only the fields
// Kabsi reads); the live and the mock module of each area return the same wire types, and index.ts turns them
// into the app types below. Fixtures with the documentation link for each: tests/fixtures/google/.

// ─── wire: Business Profile
export type Account = { name: string; accountName?: string; type?: string; role?: string; verificationState?: string; vettedState?: string };
export type ListAccountsResponse = { accounts?: Account[]; nextPageToken?: string };
export type Invitation = {
  name: string; role?: string; targetType?: string;
  targetAccount?: { name?: string; accountName?: string; type?: string };
  // Google documents address as a string; invitations.ts reads it as a postal address (see PROGRESS, P0.1-11).
  targetLocation?: { locationName?: string; address?: unknown };
};
export type ListInvitationsResponse = { invitations?: Invitation[] };

export type TimeOfDay = { hours?: number; minutes?: number };
export type GDate = { year: number; month: number; day: number };
export type TimePeriod = { openDay: string; openTime?: TimeOfDay; closeDay?: string; closeTime?: TimeOfDay };
export type SpecialHourPeriod = { startDate: GDate; endDate?: GDate; openTime?: TimeOfDay; closeTime?: TimeOfDay; closed?: boolean };
export type PostalAddress = { regionCode?: string; languageCode?: string; postalCode?: string; administrativeArea?: string; locality?: string; addressLines?: string[] };
export type Category = { name: string; displayName?: string };
export type Location = {
  name: string; title?: string; languageCode?: string; storeCode?: string;
  phoneNumbers?: { primaryPhone?: string; additionalPhones?: string[] };
  categories?: { primaryCategory?: Category; additionalCategories?: Category[] };
  storefrontAddress?: PostalAddress; websiteUri?: string;
  regularHours?: { periods?: TimePeriod[] };
  specialHours?: { specialHourPeriods?: SpecialHourPeriod[] };
  metadata?: { placeId?: string; mapsUri?: string; newReviewUri?: string; hasGoogleUpdated?: boolean; hasVoiceOfMerchant?: boolean; canDelete?: boolean };
  profile?: { description?: string };
};
export type ListLocationsResponse = { locations?: Location[]; nextPageToken?: string; totalSize?: number };
export type GoogleUpdatedLocation = { location: Location; diffMask?: string; pendingMask?: string };

export type StarRating = "STAR_RATING_UNSPECIFIED" | "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
export type ReviewReply = { comment: string; updateTime?: string };
export type Review = {
  name: string; reviewId?: string;
  reviewer?: { profilePhotoUrl?: string; displayName?: string; isAnonymous?: boolean };
  starRating?: StarRating; comment?: string; createTime?: string; updateTime?: string; reviewReply?: ReviewReply;
};
export type ListReviewsResponse = { reviews?: Review[]; averageRating?: number; totalReviewCount?: number; nextPageToken?: string };

export type CallToAction = { actionType: string; url?: string };
export type LocalPost = {
  name?: string; languageCode?: string; summary?: string; callToAction?: CallToAction;
  createTime?: string; updateTime?: string; state?: "LOCAL_POST_STATE_UNSPECIFIED" | "REJECTED" | "LIVE" | "PROCESSING";
  topicType?: string; searchUrl?: string;
};
export type ListLocalPostsResponse = { localPosts?: LocalPost[]; nextPageToken?: string };

export type MediaItem = {
  name?: string; mediaFormat?: "PHOTO" | "VIDEO"; sourceUrl?: string;
  locationAssociation?: { category?: string; priceListItemId?: string };
  googleUrl?: string; thumbnailUrl?: string; createTime?: string;
  dimensions?: { widthPixels?: number; heightPixels?: number };
  insights?: { viewCount?: string };
};
export type ListMediaItemsResponse = { mediaItems?: MediaItem[]; totalMediaItemCount?: number; nextPageToken?: string };

export type InsightsValue = { value?: string; threshold?: string };
export type SearchKeywordsResponse = { searchKeywordsCounts?: { searchKeyword?: string; insightsValue?: InsightsValue }[]; nextPageToken?: string };
export type DailyMetricsResponse = {
  multiDailyMetricTimeSeries?: {
    dailyMetricTimeSeries?: { dailyMetric?: string; timeSeries?: { datedValues?: { date?: GDate; value?: string }[] } }[];
  }[];
};

export type Attribute = { name: string; valueType?: string; values?: unknown[]; uriValues?: { uri: string }[] };
export type Attributes = { name: string; attributes?: Attribute[] };

export type NotificationSetting = { name: string; pubsubTopic?: string; notificationTypes?: string[] };

export type Admin = { name?: string; admin?: string; account?: string; role?: string; pendingInvitation?: boolean };
export type ListAdminsResponse = { admins?: Admin[] };

export type VoiceOfMerchantState = {
  hasVoiceOfMerchant?: boolean; hasBusinessAuthority?: boolean;
  waitForVoiceOfMerchant?: Record<string, never>; verify?: { hasPendingVerification?: boolean };
  resolveOwnershipConflict?: Record<string, never>; complyWithGuidelines?: { recommendationReason?: string };
};
export type Verification = { name?: string; method?: string; state?: string; createTime?: string };
export type ListVerificationsResponse = { verifications?: Verification[]; nextPageToken?: string };

export type PlaceActionLink = {
  name?: string; providerType?: string; isEditable?: boolean; uri?: string; placeActionType?: string;
  isPreferred?: boolean; createTime?: string; updateTime?: string;
};
export type ListPlaceActionLinksResponse = { placeActionLinks?: PlaceActionLink[]; nextPageToken?: string };

// ─── wire: Places API (New)
export type LocalizedText = { text?: string; languageCode?: string };
export type AddressComponent = { longText?: string; shortText?: string; types?: string[]; languageCode?: string };
export type Place = {
  id?: string; name?: string; displayName?: LocalizedText; formattedAddress?: string; addressComponents?: AddressComponent[];
  primaryType?: string; primaryTypeDisplayName?: LocalizedText; types?: string[]; rating?: number; userRatingCount?: number;
};
export type SearchTextResponse = { places?: Place[] };

// ─── app types (unchanged from _shared/google.ts)
export type ManagedLocation = { accountId: string; locationId: string; placeId: string | null; title: string };
export type SkippedInvitation = { invitation: string; reason: string; location: string };
export type GoogleReview = {
  reviewId: string; reviewer: string; rating: number; comment: string | null;
  createTime: string; updateTime: string | null; reply: string | null;
};
export type PostInput = { summary: string; languageCode: string; ctaType?: string | null; ctaUrl?: string | null };
export type SpecialDay = { startDate: string; endDate: string; closed: boolean; openTime?: string | null; closeTime?: string | null };
export const SHIELD_FIELDS = ["title", "phone", "address", "website", "hours", "categories"] as const;
export type ShieldField = typeof SHIELD_FIELDS[number];
export type FieldValue = { display: string; raw: unknown };
export type Listing = Record<ShieldField, FieldValue>;
export type MockSeed = { name: string; address: string | null; phone?: string; hours?: string };
export type WriteResult = { state: "live" | "in_review" | "rejected"; response: unknown };
