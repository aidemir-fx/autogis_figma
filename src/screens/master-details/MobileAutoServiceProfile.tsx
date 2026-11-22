import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Drawer, IconButton } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import { Map as YandexMap, Placemark, YMaps } from "@pbe/react-yandex-maps";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Provider } from "@modules/providers";
import { MasterStatus } from "@modules/masters";
import { CreateOrderModal } from "@modules/masters/features/CreateOrderModal";
import { StoryHighlights } from "@modules/stories";
import { useAuth, useUserProfile } from "@common/hooks";
import { formatRegistrationDate } from "@common/lib/formatRegistrationDate";
import { getProviderReviews, type Review } from "@modules/reviews";
import { ProviderReviewAction, ReviewPhotos } from "@modules/reviews/components/ProviderReviewAction";
import { addAutoServiceFavorite, getAutoServiceFavorite, removeAutoServiceFavorite } from "@modules/providers";
import {
    ActionButton,
    ActionIconButton,
    AddressLink,
    BottomActionRow,
    EmptyState,
    FeatureItem,
    FeatureList,
    HeroCell,
    HeroImage,
    HeroPlaceholder,
    HeroRow,
    MapCard,
    MapCanvas,
    MobileMasterPage,
    MobileSection,
    PaymentMethod,
    PaymentMethodLabel,
    PaymentMethodList,
    ProfileHeader,
    ProfileHeaderTitle,
    ProfileIdentity,
    ProfileName,
    ProfileSubtitle,
    RatingLine,
    RegistrationDate,
    ReviewAuthor,
    ReviewAvatar,
    ReviewCard,
    ReviewDate,
    ReviewHeader,
    ReviewStars,
    ReviewText,
    ReviewsLink,
    ReviewsScore,
    ReviewsSummary,
    SectionHeader,
    SectionTitle,
    ServiceChip,
    ServicesWrap,
    StatusText,
} from "./mobileStyles";

const DAY_LABELS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

function initials(name?: string | null) {
    return (name || "Автосервис")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

function formatReviewDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ru-RU");
}

function averageRating(provider: Provider, reviews: Review[]) {
    if (provider.rating > 0) return provider.rating;
    return reviews.length
        ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
        : 0;
}

export function MobileAutoServiceProfile({ provider }: { provider: Provider }) {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { profile } = useUserProfile({ enabled: isAuthenticated });
    const queryClient = useQueryClient();
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ services: true, schedule: false, conditions: true });
    const [reviewsOpen, setReviewsOpen] = useState(false);
    const [showAllServices, setShowAllServices] = useState(false);
    const [showAllBrands, setShowAllBrands] = useState(false);
    const [bookingOpen, setBookingOpen] = useState(false);
    const favoriteQuery = useQuery({
        queryKey: ["autoServiceFavorite", provider.id],
        queryFn: () => getAutoServiceFavorite(provider.id),
        enabled: isAuthenticated && Boolean(provider.id),
    });
    const favoriteMutation = useMutation({
        mutationFn: (next: boolean) => next ? addAutoServiceFavorite(provider.id) : removeAutoServiceFavorite(provider.id),
        onSuccess: (value) => queryClient.setQueryData(["autoServiceFavorite", provider.id], value),
        onError: () => toast.error("Не удалось изменить избранное"),
    });
    const reviewsQuery = useQuery({
        queryKey: ["providerReviews", provider.userId],
        queryFn: () => getProviderReviews(provider.userId),
        enabled: Boolean(provider.userId),
    });

    const reviews = reviewsQuery.data ?? [];
    const rating = averageRating(provider, reviews);
    const name = provider.fullName || provider.name || "Автосервис";
    const coverUrl = provider.coverImageUrl || provider.coverImage;
    const registrationDate = formatRegistrationDate(provider.createdAt);
    const phone = provider.workingPhone || provider.phone;
    const isOpen = provider.currentStatus === MasterStatus.AVAILABLE;
    const isSelfProfile = Boolean(profile?.id && profile.id === provider.userId);
    const services = [...new Set([...(provider.services ?? []), ...(provider.professions ?? [])].filter(Boolean))];
    const brands = provider.brandSupport ?? [];
    const hasConditions = provider.hasParking !== undefined || (provider.liftCount ?? 0) > 0 || provider.warranty !== undefined || Boolean(provider.hotline) || brands.length > 0;
    const hasFacilityDetails = provider.hasParking !== undefined || (provider.liftCount ?? 0) > 0 || provider.warranty !== undefined || Boolean(provider.hotline);
    const canBookOnline = provider.onlineBookingEnabled && !provider.liveQueueEnabled && !isSelfProfile;

    const handleFavorite = () => {
        if (!isAuthenticated) {
            navigate(`/login?returnTo=${encodeURIComponent(`/provider?id=${provider.id}&type=auto_service`)}`);
            return;
        }
        favoriteMutation.mutate(!favoriteQuery.data);
    };

    const handleBooking = () => {
        if (!isAuthenticated) {
            navigate(`/login?returnTo=${encodeURIComponent(`/provider?id=${provider.id}&type=auto_service`)}`);
            return;
        }
        if (canBookOnline) setBookingOpen(true);
    };

    const toggle = (key: string) => setExpanded((state) => ({ ...state, [key]: !state[key] }));
    const openRoute = () => {
        const lat = provider.coordinates?.x;
        const lng = provider.coordinates?.y;
        if (typeof lat !== "number" || typeof lng !== "number" || (lat === 0 && lng === 0)) return;
        window.open(`https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto`, "_blank", "noopener,noreferrer");
    };

    const renderReview = (review: Review) => {
        const author = review.from?.name || review.from?.phone || "Клиент";
        return (
            <ReviewCard key={review.id}>
                <ReviewHeader>
                    <ReviewAvatar>
                        {review.from?.avatarUrl ? <img src={review.from.avatarUrl} alt="" /> : initials(author)}
                    </ReviewAvatar>
                    <ReviewAuthor><strong>{author}</strong><ReviewDate>{formatReviewDate(review.createdAt)}</ReviewDate></ReviewAuthor>
                    <ReviewStars aria-label={`Оценка ${review.rating} из 5`}>
                        {[1, 2, 3, 4, 5].map((star) => <StarRoundedIcon key={star} sx={{ color: star <= review.rating ? "var(--ds-color-yellow-500)" : "var(--ds-color-gray-300)", fontSize: 15 }} />)}
                    </ReviewStars>
                </ReviewHeader>
                {review.comment && <ReviewText>{review.comment}</ReviewText>}
                <ReviewPhotos urls={review.photoUrls} />
            </ReviewCard>
        );
    };

    return (
        <MobileMasterPage>
            <ProfileHeader>
                <IconButton onClick={() => navigate(-1)} aria-label="Назад" size="small"><ArrowBackRoundedIcon /></IconButton>
                <ProfileHeaderTitle>Профиль автосервиса</ProfileHeaderTitle>
            </ProfileHeader>

            <HeroRow $count={1}>
                {coverUrl ? <HeroCell><HeroImage src={coverUrl} alt={name} /></HeroCell> : <HeroPlaceholder><span>{initials(name)}</span></HeroPlaceholder>}
            </HeroRow>

            <ProfileIdentity>
                <div style={{ minWidth: 0 }}>
                    <ProfileName>{name}</ProfileName>
                    <ProfileSubtitle>{provider.professions?.join(", ") || "Автосервис"}</ProfileSubtitle>
                    <RatingLine><StarRoundedIcon sx={{ color: "var(--ds-color-yellow-500)", fontSize: 17 }} /><strong>{rating ? rating.toFixed(1) : "0.0"}</strong><span>({provider.reviewsCount ?? reviews.length})</span></RatingLine>
                    {registrationDate && <RegistrationDate>На АвтоГис с {registrationDate}</RegistrationDate>}
                </div>
                <ActionIconButton type="button" aria-label={favoriteQuery.data ? "Убрать из избранного" : "Добавить в избранное"} onClick={handleFavorite} disabled={favoriteMutation.isPending} $active={Boolean(favoriteQuery.data)}>
                    {favoriteQuery.data ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
                </ActionIconButton>
            </ProfileIdentity>

            <StatusText $open={isOpen}>{isOpen ? `Открыто${provider.workTo ? ` до ${provider.workTo.slice(0, 5)}` : ""}` : "Закрыто"}</StatusText>
            {provider.description && <p style={{ margin: "10px 16px 0", color: "var(--ds-color-gray-700)", fontSize: 13, lineHeight: 1.45 }}>{provider.description}</p>}
            {provider.liveQueueEnabled && <div style={{ padding: "6px 16px 0" }}><ServiceChip>Живая очередь</ServiceChip></div>}
            <BottomActionRow>
                <ActionButton type="button" onClick={handleBooking} disabled={!canBookOnline} style={!canBookOnline ? { backgroundColor: "var(--ds-color-gray-300)", color: "var(--ds-color-gray-500)", opacity: 1 } : undefined}>Записаться онлайн</ActionButton>
                {phone && <ActionIconButton as="a" href={`tel:${phone}`} aria-label="Позвонить"><PhoneRoundedIcon /></ActionIconButton>}
            </BottomActionRow>

            <MobileSection><StoryHighlights authorId={provider.userId} manage={profile?.id === provider.userId} /></MobileSection>

            <MobileSection>
                <SectionHeader onClick={() => toggle("services")}><SectionTitle>Услуги и специализация</SectionTitle>{expanded.services ? <KeyboardArrowUpRoundedIcon /> : <KeyboardArrowDownRoundedIcon />}</SectionHeader>
                {expanded.services && (services.length ? <ServicesWrap>{services.slice(0, showAllServices ? services.length : 6).map((item) => <ServiceChip key={item}>{item}</ServiceChip>)}{services.length > 6 && <ServiceChip as="button" type="button" onClick={() => setShowAllServices((value) => !value)} style={{ border: 0, font: "inherit", cursor: "pointer" }}>{showAllServices ? "Свернуть" : `+${services.length - 6}`}</ServiceChip>}</ServicesWrap> : <EmptyState>Услуги пока не указаны</EmptyState>)}
            </MobileSection>

            {hasConditions && <MobileSection>
                <SectionHeader onClick={() => toggle("conditions")}><SectionTitle>Об автосервисе</SectionTitle>{expanded.conditions ? <KeyboardArrowUpRoundedIcon /> : <KeyboardArrowDownRoundedIcon />}</SectionHeader>
                {expanded.conditions && hasFacilityDetails && <FeatureList>
                    {provider.hasParking !== undefined && <FeatureItem><CheckRoundedIcon />Парковка: {provider.hasParking ? "есть" : "нет"}</FeatureItem>}
                    {(provider.liftCount ?? 0) > 0 && <FeatureItem><CheckRoundedIcon />Посты: {provider.liftCount}</FeatureItem>}
                    {provider.warranty !== undefined && <FeatureItem><CheckRoundedIcon />Гарантия: {provider.warranty ? "есть" : "нет"}</FeatureItem>}
                    {provider.hotline && <FeatureItem><PhoneRoundedIcon />Горячая линия: {provider.hotline}</FeatureItem>}
                </FeatureList>}
                {expanded.conditions && brands.length > 0 && <div style={{ paddingTop: 10 }}>
                    <SectionTitle as="div">Поддерживаемые марки</SectionTitle>
                    <ServicesWrap>{brands.slice(0, showAllBrands ? brands.length : 6).map((brand) => <ServiceChip key={brand}>{brand}</ServiceChip>)}{brands.length > 6 && <ServiceChip as="button" type="button" onClick={() => setShowAllBrands((value) => !value)} style={{ border: 0, font: "inherit", cursor: "pointer" }}>{showAllBrands ? "Свернуть" : `+${brands.length - 6}`}</ServiceChip>}</ServicesWrap>
                </div>}
            </MobileSection>}

            {(provider.payments?.length ?? 0) > 0 && <MobileSection>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <SectionTitle>Способы оплаты</SectionTitle>
                    <PaymentMethodList>
                        {provider.payments?.includes("cash") && <PaymentMethod><PaymentsOutlinedIcon titleAccess="Наличные" /><PaymentMethodLabel>Наличные</PaymentMethodLabel></PaymentMethod>}
                        {provider.payments?.includes("card") && <PaymentMethod><CreditCardOutlinedIcon titleAccess="Карта" /><PaymentMethodLabel>Карта</PaymentMethodLabel></PaymentMethod>}
                        {(provider.payments?.includes("sbp") || provider.payments?.includes("qr")) && <PaymentMethod><QrCode2OutlinedIcon titleAccess="СБП" /><PaymentMethodLabel>СБП</PaymentMethodLabel></PaymentMethod>}
                    </PaymentMethodList>
                </div>
            </MobileSection>}

            <MobileSection>
                <SectionHeader onClick={() => toggle("schedule")}><SectionTitle>График работы</SectionTitle>{expanded.schedule ? <KeyboardArrowUpRoundedIcon /> : <KeyboardArrowDownRoundedIcon />}</SectionHeader>
                {expanded.schedule && <>
                    <StatusText $open={isOpen}>{isOpen ? `Открыто сегодня до ${provider.workTo?.slice(0, 5) || "закрытия"}` : "Сейчас закрыто"}</StatusText>
                    <ServicesWrap>{DAY_LABELS.map((day, index) => <ServiceChip key={day} $muted={!provider.workingDays?.[index]}>{day} {provider.workingDays?.[index] ? `${provider.workFrom?.slice(0, 5) || "08:00"}–${provider.workTo?.slice(0, 5) || "18:00"}` : "выходной"}</ServiceChip>)}</ServicesWrap>
                </>}
            </MobileSection>

            <MobileSection>
                <SectionHeader><SectionTitle>Адрес</SectionTitle></SectionHeader>
                <div>{provider.address || "Адрес не указан"}</div>
                {provider.coordinates && (provider.coordinates.x !== 0 || provider.coordinates.y !== 0) && <MapCard>
                    <MapCanvas><YMaps query={{ apikey: import.meta.env.VITE_YMAPS_API_KEY }}><YandexMap state={{ center: [provider.coordinates.x, provider.coordinates.y], zoom: 14 }} width="100%" height="160px"><Placemark geometry={[provider.coordinates.x, provider.coordinates.y]} /></YandexMap></YMaps></MapCanvas>
                    <AddressLink type="button" onClick={openRoute}>Построить маршрут</AddressLink>
                </MapCard>}
            </MobileSection>

            <MobileSection>
                <SectionHeader><SectionTitle>Отзывы</SectionTitle>{reviews.length > 3 && <ReviewsLink type="button" onClick={() => setReviewsOpen(true)}>Все {reviews.length}</ReviewsLink>}</SectionHeader>
                {reviews.length > 0 ? <>
                    <ProviderReviewAction providerId={provider.userId} reviews={reviews} />
                <ReviewsSummary><ReviewsScore>{rating ? rating.toFixed(1) : "0.0"}</ReviewsScore><ReviewStars>{[1, 2, 3, 4, 5].map((star) => <StarRoundedIcon key={star} sx={{ color: star <= Math.round(rating) ? "var(--ds-color-yellow-500)" : "var(--ds-color-gray-300)", fontSize: 15 }} />)}</ReviewStars><span>{reviews.length} отзывов</span></ReviewsSummary>
                    <div>{reviews.slice(0, 3).map(renderReview)}</div>
                </> : <EmptyState>Пока нет отзывов</EmptyState>}
            </MobileSection>

            <Drawer anchor="bottom" open={reviewsOpen} onClose={() => setReviewsOpen(false)} PaperProps={{ sx: { borderRadius: "var(--ds-radius-24) var(--ds-radius-24) 0 0", maxHeight: "85vh" } }}>
                <div style={{ padding: "18px 16px 28px", overflowY: "auto" }}><SectionHeader><SectionTitle>Все отзывы</SectionTitle><ReviewsLink type="button" onClick={() => setReviewsOpen(false)}>Закрыть</ReviewsLink></SectionHeader>{reviews.map(renderReview)}</div>
            </Drawer>

            {canBookOnline && <CreateOrderModal open={bookingOpen} onClose={() => setBookingOpen(false)} providers={[provider]} />}
        </MobileMasterPage>
    );
}
