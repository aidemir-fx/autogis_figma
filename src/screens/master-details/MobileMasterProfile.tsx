import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Drawer, IconButton, useMediaQuery } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Master, MasterFeature, addMasterFavorite, getMasterFavorite, removeMasterFavorite } from "@modules/masters";
import { useAuth, useCoords, useUserProfile } from "@common/hooks";
import { formatRegistrationDate } from "@common/lib/formatRegistrationDate";
import { getAccountAvatarUrl, getPublicEntityMedia, type MediaAsset } from "@modules/media/api";
import { getProviderReviews, type Review } from "@modules/reviews";
import { StoryHighlights } from "@modules/stories";
import { CreateOrderModal } from "@modules/masters/features/CreateOrderModal";
import { Map as YandexMap, Placemark, YMaps } from "@pbe/react-yandex-maps";
import {
    ActionButton,
    ActionIconButton,
    AddressLink,
    AvatarFallback,
    AvatarImage,
    BottomActionRow,
    FeatureItem,
    FeatureList,
    GalleryImage,
    GalleryGrid,
    HeroAvatar,
    MasterAvatarWrap,
    MasterProfileIdentity,
    MasterIdentityDetails,
    MobileMasterPage,
    MobileSection,
    ProfileHeader,
    ProfileHeaderTitle,
    ProfileName,
    ProfileSubtitle,
    RatingLine,
    RegistrationDate,
    SectionHeader,
    SectionTitle,
    ServiceChip,
    ServicesWrap,
    StatusText,
    PaymentIcons,
    ReviewCard,
    ReviewHeader,
    ReviewAuthor,
    ReviewAvatar,
    ReviewDate,
    ReviewStars,
    ReviewText,
    ReviewsSummary,
    ReviewsScore,
    ReviewsLink,
    MapCard,
    MapCanvas,
    EmptyState,
} from "./mobileStyles";

const FEATURE_LABELS: Record<MasterFeature, string> = {
    parking: "Парковка",
    waiting_area: "Зона ожидания",
    coffee: "Кофе для клиентов",
    wifi: "Wi-Fi",
    towing: "Эвакуатор",
    spare_parts: "Запчасти в наличии",
};

function assetUrl(asset?: MediaAsset) {
    return asset?.urls?.large?.webp || asset?.urls?.large?.jpeg || asset?.urls?.medium?.webp || asset?.urls?.medium?.jpeg || asset?.urls?.original;
}

function initials(name?: string) {
    return (name || "Мастер")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

function formatReviewDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("ru-RU");
}

function sortWorkAssets(master: Master, assets: MediaAsset[]) {
    const order = new Map((master.workPhotoAssetIds ?? []).map((id, index) => [id, index]));
    return [...assets].sort((a, b) => (order.get(a.assetId) ?? 9999) - (order.get(b.assetId) ?? 9999));
}

function ReviewStarsRow({ rating }: { rating: number }) {
    return (
        <ReviewStars aria-label={`Оценка ${rating} из 5`}>
            {[1, 2, 3, 4, 5].map((value) => (
                <StarRoundedIcon key={value} sx={{ color: value <= rating ? "var(--ds-color-yellow-500)" : "var(--ds-color-gray-300)", fontSize: 16 }} />
            ))}
        </ReviewStars>
    );
}

export function MobileMasterProfile({ master }: { master: Master }) {
    const navigate = useNavigate();
    const isMobile = useMediaQuery("(max-width: 1024px)");
    const { isAuthenticated } = useAuth();
    const { profile: currentProfile } = useUserProfile({ enabled: isAuthenticated });
    const { userCoords } = useCoords();
    const queryClient = useQueryClient();
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ services: true, schedule: false, address: true });
    const [reviewsOpen, setReviewsOpen] = useState(false);
    const [showAllPhotos, setShowAllPhotos] = useState(false);
    const [bookingOpen, setBookingOpen] = useState(false);

    const mediaQuery = useQuery({
        queryKey: ["publicWorkMedia", master.userId],
        queryFn: () => getPublicEntityMedia("work", master.userId),
        enabled: Boolean(master.userId),
        staleTime: 60_000,
    });
    const accountAvatarQuery = useQuery({
        queryKey: ["account-avatar", master.userId],
        queryFn: () => getAccountAvatarUrl(master.userId),
        enabled: Boolean(master.userId),
        staleTime: 5 * 60_000,
    });
    const reviewsQuery = useQuery({
        queryKey: ["providerReviews", master.userId],
        queryFn: () => getProviderReviews(master.userId),
        enabled: Boolean(master.userId),
    });
    const favoriteQuery = useQuery({
        queryKey: ["masterFavorite", master.id],
        queryFn: () => getMasterFavorite(master.id),
        enabled: isAuthenticated && Boolean(master.id),
    });
    const favoriteMutation = useMutation({
        mutationFn: (next: boolean) => next ? addMasterFavorite(master.id) : removeMasterFavorite(master.id),
        onSuccess: (value) => queryClient.setQueryData(["masterFavorite", master.id], value),
        onError: () => toast.error("Не удалось изменить избранное"),
    });

    const assets = mediaQuery.data?.assets ?? [];
    const sortedAssets = useMemo(() => sortWorkAssets(master, assets), [master, assets]);
    const reviews = reviewsQuery.data ?? [];
    const averageRating = master.rating > 0 ? master.rating : reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
    const avatarUrl = accountAvatarQuery.data ?? undefined;
    const registrationDate = formatRegistrationDate(master.createdAt);
    const featureKeys = (master.features ?? []) as MasterFeature[];
    const phone = master.workingPhone || master.user?.phone;
    const isSelfProfile = currentProfile?.id === master.userId;
    const canBook = !isSelfProfile;
    const isOpen = master.currentStatus === "available";

    if (!isMobile) return null;

    const toggle = (key: string) => setExpanded((state) => ({ ...state, [key]: !state[key] }));
    const handleFavorite = () => {
        if (!isAuthenticated) {
            navigate("/login", { state: { from: `/provider?id=${master.id}&type=master` } });
            return;
        }
        favoriteMutation.mutate(!favoriteQuery.data);
    };
    const handleBooking = () => {
        if (!isAuthenticated) {
            navigate("/login", { state: { from: `/provider?id=${master.id}&type=master` } });
            return;
        }
        if (canBook) setBookingOpen(true);
    };
    const openRoute = () => {
        const [lat, lng] = [master.coordinates?.x, master.coordinates?.y];
        if (typeof lat !== "number" || typeof lng !== "number") return;
        window.open(`https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto`, "_blank", "noopener,noreferrer");
    };

    const renderReview = (review: Review) => {
        const author = review.from?.name || review.from?.phone || "Клиент";
        const reviewAvatar = review.from?.avatarUrl;
        return (
            <ReviewCard key={review.id}>
                <ReviewHeader>
                    <ReviewAvatar>
                        {reviewAvatar ? <img src={reviewAvatar} alt="" /> : initials(author).slice(0, 2)}
                    </ReviewAvatar>
                    <ReviewAuthor>
                        <strong>{author}</strong>
                        <ReviewDate>{formatReviewDate(review.createdAt)}</ReviewDate>
                    </ReviewAuthor>
                    <ReviewStarsRow rating={review.rating} />
                </ReviewHeader>
                {review.comment && <ReviewText>{review.comment}</ReviewText>}
            </ReviewCard>
        );
    };

    return (
        <MobileMasterPage>
            <ProfileHeader>
                <IconButton onClick={() => navigate(-1)} aria-label="Назад" size="small"><ArrowBackRoundedIcon /></IconButton>
                <ProfileHeaderTitle>Профиль мастера</ProfileHeaderTitle>
            </ProfileHeader>

            <MasterProfileIdentity>
                <MasterAvatarWrap>
                    <HeroAvatar>{avatarUrl ? <AvatarImage src={avatarUrl} alt={master.fullName || "Мастер"} /> : <AvatarFallback>{initials(master.fullName)}</AvatarFallback>}</HeroAvatar>
                </MasterAvatarWrap>
                <MasterIdentityDetails>
                    <ProfileName>{master.fullName || "Мастер"}</ProfileName>
                    <ProfileSubtitle>{master.professions?.join(", ") || "Автомастер"}</ProfileSubtitle>
                    <RatingLine><StarRoundedIcon sx={{ color: "var(--ds-color-yellow-500)", fontSize: 17 }} /><strong>{averageRating ? averageRating.toFixed(1) : "0.0"}</strong><span>({master.reviewsCount ?? reviews.length})</span></RatingLine>
                    {registrationDate && <RegistrationDate>На АвтоГис с {registrationDate}</RegistrationDate>}
                </MasterIdentityDetails>
                <ActionIconButton type="button" aria-label="Добавить в избранное" onClick={handleFavorite} $active={Boolean(favoriteQuery.data)}>
                    {favoriteQuery.data ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
                </ActionIconButton>
            </MasterProfileIdentity>

            <StatusText $open={isOpen}>{isOpen ? `Открыто${master.workTo ? ` до ${master.workTo}` : ""}` : "Закрыто"}</StatusText>
            <BottomActionRow>
                <ActionButton type="button" onClick={handleBooking} disabled={!canBook}><CalendarMonthRoundedIcon />Записаться онлайн</ActionButton>
                {phone && <ActionIconButton as="a" href={`tel:${phone}`} aria-label="Позвонить"><PhoneRoundedIcon /></ActionIconButton>}
            </BottomActionRow>

            <MobileSection><StoryHighlights authorId={master.userId} manage={currentProfile?.id === master.userId} /></MobileSection>

            <MobileSection>
                <SectionHeader onClick={() => toggle("services")}><SectionTitle>Услуги</SectionTitle>{expanded.services ? <KeyboardArrowUpRoundedIcon /> : <KeyboardArrowDownRoundedIcon />}</SectionHeader>
                {expanded.services && <ServicesWrap>{(master.services ?? []).slice(0, 5).map((service) => <ServiceChip key={service}>{service}</ServiceChip>)}{(master.services?.length ?? 0) > 5 && <ServiceChip>+{(master.services?.length ?? 0) - 5}</ServiceChip>}</ServicesWrap>}
            </MobileSection>

            <MobileSection>
                <SectionHeader><SectionTitle>Особенности</SectionTitle><PaymentIcons>
                    {master.payments?.includes("cash") && <PaymentsOutlinedIcon titleAccess="Наличные" />}
                    {master.payments?.includes("card") && <CreditCardOutlinedIcon titleAccess="Карта" />}
                    {(master.payments?.includes("sbp") || master.payments?.includes("qr")) && <QrCode2OutlinedIcon titleAccess="СБП" />}
                </PaymentIcons></SectionHeader>
                <FeatureList>{featureKeys.map((feature) => <FeatureItem key={feature}><CheckRoundedIcon />{FEATURE_LABELS[feature]}</FeatureItem>)}</FeatureList>
            </MobileSection>

            <MobileSection>
                <SectionHeader><SectionTitle>Фото работ</SectionTitle>{sortedAssets.length > 3 && <ReviewsLink type="button" onClick={() => setShowAllPhotos((value) => !value)}>{showAllPhotos ? "Свернуть" : `Все ${sortedAssets.length}`}</ReviewsLink>}</SectionHeader>
                {sortedAssets.length > 0 ? <GalleryGrid>{(showAllPhotos ? sortedAssets : sortedAssets.slice(0, 3)).map((asset) => <GalleryImage key={asset.assetId} src={assetUrl(asset)} alt="Фото работы" />)}</GalleryGrid> : <EmptyState>Фото работ пока не добавлены</EmptyState>}
            </MobileSection>

            <MobileSection>
                <SectionHeader onClick={() => toggle("schedule")}><SectionTitle>График работы</SectionTitle>{expanded.schedule ? <KeyboardArrowUpRoundedIcon /> : <KeyboardArrowDownRoundedIcon />}</SectionHeader>
                {expanded.schedule && <div><StatusText $open={isOpen}>{isOpen ? `Открыто сегодня до ${master.workTo || "закрытия"}` : "Сейчас закрыто"}</StatusText><ServicesWrap>{["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((day, index) => <ServiceChip key={day} $muted={!master.workingDays?.[index]}>{day} {master.workingDays?.[index] ? `${master.workFrom || "08:00"}–${master.workTo || "18:00"}` : "выходной"}</ServiceChip>)}</ServicesWrap></div>}
            </MobileSection>

            <MobileSection>
                <SectionHeader><SectionTitle>Адрес</SectionTitle></SectionHeader>
                <div>{master.address || "Адрес не указан"}</div>
                <MapCard><MapCanvas><YMaps query={{ apikey: import.meta.env.VITE_YMAPS_API_KEY }}><YandexMap state={{ center: [master.coordinates?.x || userCoords?.[0] || 0, master.coordinates?.y || userCoords?.[1] || 0], zoom: 12 }} width="100%" height="160px"><Placemark geometry={[master.coordinates?.x || 0, master.coordinates?.y || 0]} /></YandexMap></YMaps></MapCanvas><AddressLink type="button" onClick={openRoute}>Построить маршрут</AddressLink></MapCard>
            </MobileSection>

            <MobileSection>
                <SectionHeader><SectionTitle>Отзывы</SectionTitle>{reviews.length > 3 && <ReviewsLink type="button" onClick={() => setReviewsOpen(true)}>Все {reviews.length}</ReviewsLink>}</SectionHeader>
                <ReviewsSummary><ReviewsScore>{averageRating ? averageRating.toFixed(1) : "0.0"}</ReviewsScore><ReviewStarsRow rating={Math.round(averageRating)} /><span>{reviews.length} отзывов</span></ReviewsSummary>
                <div>{reviews.slice(0, 3).map(renderReview)}</div>
            </MobileSection>

            <Drawer anchor="bottom" open={reviewsOpen} onClose={() => setReviewsOpen(false)} PaperProps={{ sx: { borderRadius: "var(--ds-radius-24) var(--ds-radius-24) 0 0", maxHeight: "85vh" } }}>
                <div style={{ padding: "18px 16px 28px", overflowY: "auto" }}><SectionHeader><SectionTitle>Все отзывы</SectionTitle><ReviewsLink type="button" onClick={() => setReviewsOpen(false)}>Закрыть</ReviewsLink></SectionHeader>{reviews.map(renderReview)}</div>
            </Drawer>

            <CreateOrderModal open={bookingOpen} onClose={() => setBookingOpen(false)} providers={[master as any]} />
        </MobileMasterPage>
    );
}
