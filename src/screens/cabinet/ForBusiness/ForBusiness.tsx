import React, { useCallback, useMemo, useRef, useState } from "react";
import { Controller, UseFormReturn, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "@common/hooks";
import { Button } from "@common/components";
import {
    AutoServiceCategoryIcon,
    AutoShopCategoryIcon,
    AutoWashCategoryIcon,
    PrivateMasterCategoryIcon,
} from "@common/icons";
import { http } from "@common/lib/http";
import { DashboardLayout } from "@modules/layout/features/UserCabinetLayout/DashboardLayout";
import {
    ACTIVITY_GROUP_LABELS,
    ACTIVITY_GROUP_OPTIONS,
    ACTIVITY_SUBTYPE_LABELS,
    ActivityGroupCode,
    ActivityGroupOption,
    ActivitySubtypeCode,
    BusinessApplication,
    CreateBusinessApplicationRequest,
    PRIVATE_EXECUTOR_GROUP,
    getActivityGroupOption,
    isPrivateExecutorGroup,
    isSingleSubtypeGroup,
    resolveActivitySelection,
} from "./types";
import {
    AccentKey,
    AgreementBox,
    AgreementError,
    AgreementRow,
    CardChip,
    CardCount,
    CardDesc,
    CardIcon,
    CardMeta,
    CardName,
    CardNum,
    CardTop,
    CardsGrid,
    ChangeTypeBtn,
    Container,
    Eyebrow,
    ExpandDesc,
    ExpandGrid,
    ExpandHead,
    ExpandName,
    FieldCell,
    FieldError,
    FieldHelper,
    FieldInput,
    FieldLabel,
    FieldTextarea,
    FieldsGrid,
    FieldsHead,
    FieldsHint,
    FieldsReveal,
    FieldsTitle,
    GroupCard,
    Header,
    MiniSteps,
    ProfileNote,
    Shell,
    StatusActions,
    StatusAlert,
    StatusCard,
    StatusIconWrap,
    StatusMeta,
    StatusMetaRow,
    StatusShell,
    StatusText,
    StatusTitle,
    Subtitle,
    SubtypeRadio,
    SubtypeRow,
    SubtypeText,
    SubtypesBlock,
    SubtypesLabel,
    SummaryBar,
    SummaryChip,
    SummaryChips,
    SummaryProgressChip,
    SummarySend,
    Title,
} from "./styles";

type FormValues = {
    activityGroupCode: ActivityGroupCode | "";
    activitySubtypeCode: ActivitySubtypeCode | "";
    businessName: string;
    applicantName: string;
    city: string;
    address: string;
    phone: string;
    yandexMapsUrl: string;
    comment: string;
    agreedToTerms: boolean;
};

const GROUP_META: Record<
    ActivityGroupCode,
    {
        accent: AccentKey;
        icon: string;
        chips: string[];
        fieldsTitle: string;
        fieldsHint: string;
    }
> = {
    private_executor: {
        accent: "private_executor",
        icon: PrivateMasterCategoryIcon,
        chips: ["физ · лицо", "выезд"],
        fieldsTitle: "Ваши",
        fieldsHint: "подставлены из профиля · можно править",
    },
    auto_service: {
        accent: "auto_service",
        icon: AutoServiceCategoryIcon,
        chips: ["юр · лицо", "стационар"],
        fieldsTitle: "О",
        fieldsHint: "появится в карточке точки",
    },
    auto_wash: {
        accent: "auto_wash",
        icon: AutoWashCategoryIcon,
        chips: ["поток", "24 / 7"],
        fieldsTitle: "О",
        fieldsHint: "появится в карточке мойки",
    },
    auto_shop: {
        accent: "auto_shop",
        icon: AutoShopCategoryIcon,
        chips: ["розница", "каталог"],
        fieldsTitle: "О",
        fieldsHint: "появится в карточке магазина",
    },
};

const GROUP_ORDER: ActivityGroupCode[] = [
    "private_executor",
    "auto_service",
    "auto_wash",
    "auto_shop",
];

function getAccentFor(groupCode: ActivityGroupCode | ""): AccentKey {
    return groupCode ? GROUP_META[groupCode].accent : "neutral";
}

function getDefaultFormValues(): FormValues {
    return {
        activityGroupCode: "",
        activitySubtypeCode: "",
        businessName: "",
        applicantName: "",
        city: "",
        address: "",
        phone: "+7",
        yandexMapsUrl: "",
        comment: "",
        agreedToTerms: false,
    };
}

function trimToUndefined(value: string) {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}

function isValidYandexMapsUrl(value: string) {
    try {
        const parsed = new URL(value.trim());
        const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
        const allowedDomains = [
            "yandex.ru",
            "yandex.com",
            "yandex.by",
            "yandex.kz",
            "yandex.uz",
            "ya.ru",
        ];

        return allowedDomains.some(
            (domainName) =>
                hostname === domainName || hostname.endsWith(`.${domainName}`),
        );
    } catch {
        return false;
    }
}

function getSubmitErrorMessage(error: any) {
    const responseData = error?.response?.data;
    const serverMessage =
        responseData?.message || responseData?.error || error?.message;
    const validationDetails = responseData?.details;

    if (
        typeof validationDetails === "string" &&
        (validationDetails.includes("BusinessType") ||
            validationDetails.includes("ContactPerson"))
    ) {
        return "Сервер отвечает старым контрактом заявки. Перезапустите backend, чтобы он подхватил v2-поля activityGroupCode/activitySubtypeCode.";
    }

    if (typeof validationDetails === "string" && validationDetails.trim()) {
        return `${serverMessage || "Ошибка валидации"}: ${validationDetails}`;
    }

    return serverMessage || "Не удалось отправить заявку. Попробуйте ещё раз.";
}

function buildFormValuesFromApplication(application: BusinessApplication): FormValues {
    const selection = resolveActivitySelection(application);

    return {
        activityGroupCode: selection?.activityGroupCode ?? "",
        activitySubtypeCode: selection?.activitySubtypeCode ?? "",
        businessName: application.businessName ?? "",
        applicantName: application.applicantName ?? "",
        city: application.city ?? "",
        address: application.address ?? "",
        phone: application.phone ?? "+7",
        yandexMapsUrl: application.yandexMapsUrl ?? "",
        comment: application.comment ?? "",
        agreedToTerms: false,
    };
}

async function fetchMyApplication(): Promise<BusinessApplication | null> {
    const response = await http.get<{ application: BusinessApplication | null }>(
        "/business-applications/me",
    );
    return response.data?.application ?? null;
}

export function ForBusiness() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { profile, refetch: refetchUserProfile } = useUserProfile();
    const resolvedApplicantName = profile?.name?.trim() ?? "";
    const formTopRef = useRef<HTMLDivElement | null>(null);

    const { data: application, isLoading } = useQuery({
        queryKey: ["businessApplication", "me"],
        queryFn: fetchMyApplication,
        staleTime: 60_000,
    });

    const form = useForm<FormValues>({
        defaultValues: getDefaultFormValues(),
        mode: "onBlur",
    });

    const mutation = useMutation({
        mutationFn: async (values: FormValues) => {
            const payload: CreateBusinessApplicationRequest = {
                activityGroupCode: values.activityGroupCode as ActivityGroupCode,
                activitySubtypeCode: values.activitySubtypeCode as ActivitySubtypeCode,
                city: values.city.trim(),
                address: trimToUndefined(values.address),
                phone: values.phone.trim(),
                comment: trimToUndefined(values.comment),
                agreedToTerms: values.agreedToTerms,
                ...(values.activityGroupCode === PRIVATE_EXECUTOR_GROUP
                    ? {
                          applicantName:
                              resolvedApplicantName || values.applicantName.trim(),
                      }
                    : {
                          businessName: values.businessName.trim(),
                          yandexMapsUrl: trimToUndefined(values.yandexMapsUrl),
                      }),
            };

            const response = await http.post<BusinessApplication>(
                "/business-applications",
                payload,
            );
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["businessApplication", "me"], data);
            toast.success("Профессиональный профиль активирован.");
            form.reset(getDefaultFormValues());
        },
        onError: (error: any) => {
            console.error("Business application submit failed", error?.response?.data);
            const message = getSubmitErrorMessage(error);
            toast.error(message);
        },
    });

    const handleResubmit = useCallback(
        (nextApplication: BusinessApplication) => {
            form.reset(buildFormValuesFromApplication(nextApplication));
            queryClient.setQueryData(["businessApplication", "me"], null);
            setTimeout(() => {
                formTopRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }, 60);
        },
        [form, queryClient],
    );

    const onSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    const handleGoToProfessionalCabinet = async () => {
        // После одобрения роль и права меняются на сервере, а кэш профиля
        // может ещё содержать гостевую версию пользователя.
        await refetchUserProfile();
        navigate("/cabinet/professional", { replace: true });
    };

    if (isLoading) {
        return (
            <DashboardLayout title="Активация профессионального аккаунта">
                <StatusShell>
                    <StatusCard $accent="neutral">
                        <StatusTitle>Загрузка…</StatusTitle>
                    </StatusCard>
                </StatusShell>
            </DashboardLayout>
        );
    }

    if (application) {
        return (
            <DashboardLayout title="Активация профессионального аккаунта">
                <ApplicationStatusView
                    application={application}
                    onResubmit={() => handleResubmit(application)}
                    onGoCabinet={handleGoToProfessionalCabinet}
                />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Активация профессионального аккаунта">
            <ActivationFlow
                ref={formTopRef}
                form={form}
                onSubmit={onSubmit}
                isSubmitting={mutation.isPending}
                resolvedApplicantName={resolvedApplicantName}
            />
        </DashboardLayout>
    );
}

/* ============================================================
   Flow (card-picker + inline reveal)
   ============================================================ */

const ActivationFlow = React.forwardRef<
    HTMLDivElement,
    {
        form: UseFormReturn<FormValues>;
        onSubmit: (values: FormValues) => void;
        isSubmitting: boolean;
        resolvedApplicantName: string;
    }
>(({ form, onSubmit, isSubmitting, resolvedApplicantName }, ref) => {
    const selectedGroupCode = form.watch("activityGroupCode");
    const selectedSubtypeCode = form.watch("activitySubtypeCode");
    const agreed = form.watch("agreedToTerms");
    const watchedCity = form.watch("city");
    const watchedPhone = form.watch("phone");
    const watchedBusinessName = form.watch("businessName");
    const watchedApplicantName = form.watch("applicantName");

    const selectedGroupOption = useMemo(
        () =>
            selectedGroupCode
                ? getActivityGroupOption(selectedGroupCode as ActivityGroupCode)
                : undefined,
        [selectedGroupCode],
    );

    const accent = getAccentFor(selectedGroupCode);

    const completedSteps = useMemo(() => {
        let n = 0;
        if (selectedGroupCode) n += 1;
        if (selectedSubtypeCode) n += 1;

        const scenarioFieldsFilled = selectedGroupCode
            ? isPrivateExecutorGroup(selectedGroupCode as ActivityGroupCode)
                ? Boolean(
                      (resolvedApplicantName || watchedApplicantName.trim()) &&
                          watchedCity.trim() &&
                          watchedPhone.trim().length >= 5,
                  )
                : Boolean(
                      watchedBusinessName.trim() &&
                          watchedCity.trim() &&
                          watchedPhone.trim().length >= 5,
                  )
            : false;
        if (scenarioFieldsFilled) n += 1;
        if (agreed) n += 1;
        return n;
    }, [
        selectedGroupCode,
        selectedSubtypeCode,
        resolvedApplicantName,
        agreed,
        watchedCity,
        watchedPhone,
        watchedBusinessName,
        watchedApplicantName,
    ]);

    const handleSelectGroup = useCallback(
        (nextGroupCode: ActivityGroupCode) => {
            const currentGroupCode = form.getValues("activityGroupCode");
            const hasGroupChanged = currentGroupCode !== nextGroupCode;

            form.setValue("activityGroupCode", nextGroupCode, {
                shouldDirty: true,
                shouldValidate: false,
            });

            if (hasGroupChanged) {
                const nextGroupOption = getActivityGroupOption(nextGroupCode);
                const autoSubtype =
                    isSingleSubtypeGroup(nextGroupCode) && nextGroupOption
                        ? nextGroupOption.subtypes[0]?.value ?? ""
                        : "";

                form.setValue("activitySubtypeCode", autoSubtype, {
                    shouldDirty: true,
                    shouldValidate: false,
                });
                form.clearErrors([
                    "activitySubtypeCode",
                    "businessName",
                    "applicantName",
                    "yandexMapsUrl",
                ]);

                if (nextGroupCode === PRIVATE_EXECUTOR_GROUP) {
                    form.setValue("businessName", "");
                    form.setValue("yandexMapsUrl", "");
                } else {
                    form.setValue("applicantName", "");
                }
            }
        },
        [form],
    );

    const handleClearGroup = useCallback(() => {
        form.setValue("activityGroupCode", "");
        form.setValue("activitySubtypeCode", "");
        form.clearErrors();
    }, [form]);

    const handleSelectSubtype = useCallback(
        (subtypeCode: ActivitySubtypeCode) => {
            form.setValue("activitySubtypeCode", subtypeCode, {
                shouldDirty: true,
                shouldValidate: false,
            });
            form.clearErrors("activitySubtypeCode");
        },
        [form],
    );

    const summaryVisible = Boolean(selectedGroupCode);
    const canSubmit = completedSteps === 4;

    return (
        <Shell ref={ref}>
            <Container>
                <Header>
                    <div>
                        <Eyebrow>Активация · Profile v2</Eyebrow>
                        <Title>
                            Какой у вас <em>формат</em> работы?
                        </Title>
                        <Subtitle>
                            Выберите главный тип деятельности — дальше уточним подтип и
                            заполним только нужные для вашего сценария поля.
                        </Subtitle>
                    </div>
                    <MiniSteps aria-live="polite">
                        <i className={selectedGroupCode ? "on" : ""} />
                        <span>
                            {selectedGroupCode ? <b>тип</b> : "тип"}
                        </span>
                        <i className={selectedSubtypeCode ? "on" : ""} />
                        <span>
                            {!selectedGroupCode
                                ? "подтип"
                                : selectedSubtypeCode
                                  ? "подтип"
                                  : <b>подтип</b>}
                        </span>
                        <i className={completedSteps >= 3 ? "on" : ""} />
                        <span>данные</span>
                        <i className={canSubmit ? "on" : ""} />
                        <span>модерация</span>
                    </MiniSteps>
                </Header>

                <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                    <Controller
                        name="activityGroupCode"
                        control={form.control}
                        rules={{
                            validate: (value) =>
                                value ? true : "Выберите тип деятельности",
                        }}
                        render={() => (
                            <CardsGrid $expanded={Boolean(selectedGroupOption)}>
                                {selectedGroupOption ? (
                                    <ExpandedGroupCard
                                        group={selectedGroupOption}
                                        form={form}
                                        resolvedApplicantName={resolvedApplicantName}
                                        selectedSubtypeCode={selectedSubtypeCode}
                                        onSelectSubtype={handleSelectSubtype}
                                        onClear={handleClearGroup}
                                    />
                                ) : (
                                    GROUP_ORDER.map((code, index) => {
                                        const option = getActivityGroupOption(code);
                                        if (!option) return null;
                                        const meta = GROUP_META[code];
                                        return (
                                            <GroupCard
                                                key={code}
                                                type="button"
                                                $accent={meta.accent}
                                                $expanded={false}
                                                $dimmed={false}
                                                $selectable
                                                onClick={() => handleSelectGroup(code)}
                                                aria-label={`Выбрать тип: ${option.label}`}
                                            >
                                                <CollapsedGroupContent
                                                    option={option}
                                                    accent={meta.accent}
                                                    index={index}
                                                    iconSrc={meta.icon}
                                                    chips={meta.chips}
                                                />
                                            </GroupCard>
                                        );
                                    })
                                )}
                            </CardsGrid>
                        )}
                    />
                </form>
            </Container>

            <SummaryBar
                $accent={accent}
                $visible={summaryVisible}
                role="status"
                aria-live="polite"
            >
                <SummaryChips>
                    {selectedGroupCode && (
                        <SummaryChip $accent={accent}>
                            <i />
                            <span>тип</span>
                            <b>{ACTIVITY_GROUP_LABELS[selectedGroupCode as ActivityGroupCode]}</b>
                        </SummaryChip>
                    )}
                    {selectedSubtypeCode && (
                        <SummaryChip $accent={accent}>
                            <i />
                            <span>подтип</span>
                            <b>
                                {ACTIVITY_SUBTYPE_LABELS[selectedSubtypeCode as ActivitySubtypeCode]}
                            </b>
                        </SummaryChip>
                    )}
                    <SummaryProgressChip>
                        <span>готовность</span>
                        {completedSteps}/4
                    </SummaryProgressChip>
                </SummaryChips>
                <SummarySend
                    type="button"
                    $accent={accent}
                    disabled={!canSubmit || isSubmitting}
                    onClick={() => form.handleSubmit(onSubmit)()}
                >
                    {isSubmitting ? "Отправка…" : "Отправить"}
                    <svg viewBox="0 0 24 24" fill="none">
                        <path
                            d="M5 12h14m-6-6 6 6-6 6"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </SummarySend>
            </SummaryBar>
        </Shell>
    );
});

ActivationFlow.displayName = "ActivationFlow";

/* ============================================================
   Collapsed card content (when group is not yet selected)
   ============================================================ */

function CollapsedGroupContent({
    option,
    accent,
    index,
    iconSrc,
    chips,
}: {
    option: ActivityGroupOption;
    accent: AccentKey;
    index: number;
    iconSrc: string;
    chips: string[];
}) {
    return (
        <>
            <CardTop>
                <CardIcon $accent={accent}>
                    <img src={iconSrc} alt="" />
                </CardIcon>
                <CardNum $accent={accent}>{String(index + 1).padStart(2, "0")}</CardNum>
            </CardTop>
            <CardName>{option.label}</CardName>
            <CardDesc>{option.description}</CardDesc>
            <CardMeta>
                {chips.map((chip) => (
                    <CardChip key={chip}>{chip}</CardChip>
                ))}
                <CardCount $accent={accent}>
                    {option.subtypes.length}{" "}
                    {pluralizeRu(option.subtypes.length, [
                        "подтип",
                        "подтипа",
                        "подтипов",
                    ])}{" "}
                    →
                </CardCount>
            </CardMeta>
        </>
    );
}

function pluralizeRu(n: number, forms: [string, string, string]) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
    return forms[2];
}

/* ============================================================
   Expanded card — subtypes + fields
   ============================================================ */

function ExpandedGroupCard({
    group,
    form,
    resolvedApplicantName,
    selectedSubtypeCode,
    onSelectSubtype,
    onClear,
}: {
    group: ActivityGroupOption;
    form: UseFormReturn<FormValues>;
    resolvedApplicantName: string;
    selectedSubtypeCode: ActivitySubtypeCode | "";
    onSelectSubtype: (value: ActivitySubtypeCode) => void;
    onClear: () => void;
}) {
    const meta = GROUP_META[group.value];
    const accent = meta.accent;
    const isPrivate = isPrivateExecutorGroup(group.value);
    const hideSubtypes = isSingleSubtypeGroup(group.value);
    const showFields = Boolean(selectedSubtypeCode);

    return (
        <GroupCard
            as="div"
            $accent={accent}
            $expanded
            $dimmed={false}
            $selectable={false}
        >
            <ExpandGrid>
                <ExpandHead>
                    <CardTop>
                        <CardIcon $accent={accent}>
                            <img src={meta.icon} alt="" />
                        </CardIcon>
                        <CardNum $accent={accent}>
                            {String(GROUP_ORDER.indexOf(group.value) + 1).padStart(2, "0")}
                        </CardNum>
                    </CardTop>
                    <ExpandName>{group.label}</ExpandName>
                    <ExpandDesc>{group.description}</ExpandDesc>
                    <CardMeta style={{ marginTop: 18 }}>
                        {meta.chips.map((chip) => (
                            <CardChip key={chip}>{chip}</CardChip>
                        ))}
                    </CardMeta>
                    <ChangeTypeBtn type="button" $accent={accent} onClick={onClear}>
                        <svg viewBox="0 0 24 24" fill="none">
                            <path
                                d="M5 12h14M5 12l6-6M5 12l6 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        Сменить тип
                    </ChangeTypeBtn>
                </ExpandHead>

                {!hideSubtypes && (
                    <SubtypesBlock>
                        <Controller
                            name="activitySubtypeCode"
                            control={form.control}
                            rules={{
                                validate: (value) =>
                                    value ? true : "Выберите подтип деятельности",
                            }}
                            render={({ fieldState }) => (
                                <>
                                    <SubtypesLabel>
                                        Уточните{" "}
                                        {isPrivate ? "специализацию" : "направление"}
                                    </SubtypesLabel>
                                    {group.subtypes.map((subtype) => {
                                        const isSelected =
                                            selectedSubtypeCode === subtype.value;
                                        return (
                                            <SubtypeRow
                                                key={subtype.value}
                                                type="button"
                                                $accent={accent}
                                                $selected={isSelected}
                                                onClick={() => onSelectSubtype(subtype.value)}
                                                aria-pressed={isSelected}
                                            >
                                                <SubtypeRadio
                                                    $accent={accent}
                                                    $selected={isSelected}
                                                />
                                                <SubtypeText>
                                                    <b>{subtype.label}</b>
                                                    <span>{subtype.description}</span>
                                                </SubtypeText>
                                            </SubtypeRow>
                                        );
                                    })}
                                    {fieldState.error && (
                                        <FieldError>{fieldState.error.message}</FieldError>
                                    )}
                                </>
                            )}
                        />
                    </SubtypesBlock>
                )}
            </ExpandGrid>

            {showFields && (
                <FieldsReveal>
                    <FieldsHead>
                        <FieldsTitle $accent={accent}>
                            {meta.fieldsTitle} <em>данные</em>
                        </FieldsTitle>
                        <FieldsHint>{meta.fieldsHint}</FieldsHint>
                    </FieldsHead>

                    <ScenarioFields
                        form={form}
                        accent={accent}
                        isPrivate={isPrivate}
                        resolvedApplicantName={resolvedApplicantName}
                    />

                    <Controller
                        name="agreedToTerms"
                        control={form.control}
                        rules={{
                            validate: (value) =>
                                value === true || "Необходимо согласие",
                        }}
                        render={({ field, fieldState }) => (
                            <>
                                <AgreementRow $accent={accent}>
                                    <input
                                        type="checkbox"
                                        checked={field.value}
                                        onChange={(event) =>
                                            field.onChange(event.target.checked)
                                        }
                                        style={{
                                            position: "absolute",
                                            opacity: 0,
                                            pointerEvents: "none",
                                        }}
                                        aria-invalid={Boolean(fieldState.error)}
                                    />
                                    <AgreementBox
                                        $accent={accent}
                                        $checked={field.value}
                                        aria-hidden
                                    />
                                    <span>
                                        Я принимаю условия оферты и даю согласие на
                                        обработку персональных данных.
                                    </span>
                                </AgreementRow>
                                {fieldState.error && (
                                    <AgreementError>
                                        {fieldState.error.message}
                                    </AgreementError>
                                )}
                            </>
                        )}
                    />
                </FieldsReveal>
            )}
        </GroupCard>
    );
}

/* ============================================================
   Scenario-specific fields
   ============================================================ */

function ScenarioFields({
    form,
    accent,
    isPrivate,
    resolvedApplicantName,
}: {
    form: UseFormReturn<FormValues>;
    accent: AccentKey;
    isPrivate: boolean;
    resolvedApplicantName: string;
}) {
    const requiresManualApplicantName =
        isPrivate && resolvedApplicantName.length === 0;

    return (
        <FieldsGrid>
            {isPrivate ? (
                resolvedApplicantName ? (
                    <FieldCell $wide>
                        <FieldLabel>Имя мастера</FieldLabel>
                        <FieldInput
                            $accent={accent}
                            value={resolvedApplicantName}
                            disabled
                            readOnly
                        />
                        <FieldHelper>
                            Имя подставлено из вашего профиля. Изменить его можно в
                            настройках профиля.
                        </FieldHelper>
                    </FieldCell>
                ) : (
                    <Controller
                        name="applicantName"
                        control={form.control}
                        rules={{
                            validate: (value) => {
                                if (!requiresManualApplicantName) return true;
                                const trimmed = value.trim();
                                if (!trimmed) return "Укажите имя";
                                if (trimmed.length < 2) return "Минимум 2 символа";
                                return true;
                            },
                        }}
                        render={({ field, fieldState }) => (
                            <FieldCell $wide>
                                <FieldLabel>Имя мастера</FieldLabel>
                                <FieldInput
                                    {...field}
                                    $accent={accent}
                                    $invalid={Boolean(fieldState.error)}
                                    placeholder="Введите ваше имя"
                                />
                                {fieldState.error && (
                                    <FieldError>{fieldState.error.message}</FieldError>
                                )}
                            </FieldCell>
                        )}
                    />
                )
            ) : (
                <>
                    <Controller
                        name="businessName"
                        control={form.control}
                        rules={{
                            validate: (value) => {
                                if (isPrivate) return true;
                                const trimmed = value.trim();
                                if (!trimmed) return "Укажите название бизнеса";
                                if (trimmed.length < 2) return "Минимум 2 символа";
                                return true;
                            },
                        }}
                        render={({ field, fieldState }) => (
                            <FieldCell $wide>
                                <FieldLabel>Название бизнеса</FieldLabel>
                                <FieldInput
                                    {...field}
                                    $accent={accent}
                                    $invalid={Boolean(fieldState.error)}
                                    placeholder="Например, Шина 24"
                                />
                                {fieldState.error && (
                                    <FieldError>{fieldState.error.message}</FieldError>
                                )}
                            </FieldCell>
                        )}
                    />
                </>
            )}

            <Controller
                name="city"
                control={form.control}
                rules={{
                    validate: (value) => (value.trim() ? true : "Укажите город"),
                }}
                render={({ field, fieldState }) => (
                    <FieldCell>
                        <FieldLabel>Город</FieldLabel>
                        <FieldInput
                            {...field}
                            $accent={accent}
                            $invalid={Boolean(fieldState.error)}
                            placeholder="Например, Алматы"
                        />
                        {fieldState.error && (
                            <FieldError>{fieldState.error.message}</FieldError>
                        )}
                    </FieldCell>
                )}
            />

            <Controller
                name="phone"
                control={form.control}
                rules={{
                    validate: (value) => {
                        const trimmed = value.trim();
                        if (!trimmed) return "Укажите телефон";
                        if (trimmed.length < 5) return "Некорректный телефон";
                        return true;
                    },
                }}
                render={({ field, fieldState }) => (
                    <FieldCell>
                        <FieldLabel>Телефон</FieldLabel>
                        <FieldInput
                            {...field}
                            type="tel"
                            $accent={accent}
                            $invalid={Boolean(fieldState.error)}
                            placeholder="+7"
                        />
                        {fieldState.error && (
                            <FieldError>{fieldState.error.message}</FieldError>
                        )}
                    </FieldCell>
                )}
            />

            {!isPrivate && (
                <Controller
                    name="yandexMapsUrl"
                    control={form.control}
                    rules={{
                        validate: (value) => {
                            if (isPrivate) return true;
                            const trimmed = value.trim();
                            if (!trimmed) return true;
                            return (
                                isValidYandexMapsUrl(trimmed) ||
                                "Укажите корректную ссылку на Яндекс.Карты"
                            );
                        },
                    }}
                    render={({ field, fieldState }) => (
                        <FieldCell $wide>
                            <FieldLabel>
                                Ссылка на Яндекс.Карты · необязательно
                            </FieldLabel>
                            <FieldInput
                                {...field}
                                $accent={accent}
                                $invalid={Boolean(fieldState.error)}
                                placeholder="https://yandex.ru/maps/org/…"
                            />
                            {fieldState.error ? (
                                <FieldError>{fieldState.error.message}</FieldError>
                            ) : (
                                <FieldHelper>
                                    Ссылка помогает модератору быстрее подтвердить
                                    существование точки, но её можно добавить позже.
                                </FieldHelper>
                            )}
                        </FieldCell>
                    )}
                />
            )}

            <Controller
                name="address"
                control={form.control}
                render={({ field }) => (
                    <FieldCell $wide>
                        <FieldLabel>Адрес · необязательно</FieldLabel>
                        <FieldInput
                            {...field}
                            $accent={accent}
                            placeholder={
                                isPrivate
                                    ? "Район или ориентир (если есть свой бокс)"
                                    : "проспект Абая, 150"
                            }
                        />
                    </FieldCell>
                )}
            />

            <Controller
                name="comment"
                control={form.control}
                render={({ field }) => (
                    <FieldCell $wide>
                        <FieldLabel>Комментарий · необязательно</FieldLabel>
                        <FieldTextarea
                            {...field}
                            $accent={accent}
                            rows={2}
                            placeholder={
                                isPrivate
                                    ? "Что вы делаете лучше всех? Пара слов о себе."
                                    : "Часы работы, особенности точки, полезное для модератора."
                            }
                        />
                    </FieldCell>
                )}
            />

            {isPrivate && resolvedApplicantName && (
                <FieldCell $wide>
                    <ProfileNote $accent={accent}>
                        Имя исполнителя будет подставлено из профиля:{" "}
                        <b>{resolvedApplicantName}</b>
                    </ProfileNote>
                </FieldCell>
            )}
        </FieldsGrid>
    );
}

/* ============================================================
   Status view (pending / approved / needs_revision / rejected)
   ============================================================ */

function ApplicationStatusView({
    application,
    onResubmit,
    onGoCabinet,
}: {
    application: BusinessApplication;
    onResubmit: () => void;
    onGoCabinet: () => void;
}) {
    const selection = resolveActivitySelection(application);
    const accent: AccentKey = selection?.activityGroupCode
        ? getAccentFor(selection.activityGroupCode)
        : "neutral";

    const activityGroupLabel = selection?.activityGroupCode
        ? ACTIVITY_GROUP_LABELS[selection.activityGroupCode]
        : "—";
    const activitySubtypeLabel = selection?.activitySubtypeCode
        ? ACTIVITY_SUBTYPE_LABELS[selection.activitySubtypeCode]
        : null;
    const displayName = isPrivateExecutorGroup(selection?.activityGroupCode)
        ? application.applicantName ?? application.businessName ?? null
        : application.businessName ?? null;

    const config = getStatusConfig(application.status);

    return (
        <StatusShell>
            <StatusCard $accent={accent}>
                <StatusIconWrap $accent={accent}>{config.icon}</StatusIconWrap>
                <StatusTitle>{config.title}</StatusTitle>
                <StatusText>{config.text}</StatusText>

                <StatusMeta>
                    <StatusMetaRow>
                        <span>Тип</span>
                        <b>{activityGroupLabel}</b>
                    </StatusMetaRow>
                    {activitySubtypeLabel && (
                        <StatusMetaRow>
                            <span>Подтип</span>
                            <b>{activitySubtypeLabel}</b>
                        </StatusMetaRow>
                    )}
                    {displayName && (
                        <StatusMetaRow>
                            <span>
                                {isPrivateExecutorGroup(selection?.activityGroupCode)
                                    ? "Исполнитель"
                                    : "Название"}
                            </span>
                            <b>{displayName}</b>
                        </StatusMetaRow>
                    )}
                </StatusMeta>

                {application.rejectionReason &&
                    (application.status === "needs_revision" ||
                        application.status === "rejected") && (
                        <StatusAlert
                            $kind={
                                application.status === "needs_revision"
                                    ? "warning"
                                    : "error"
                            }
                        >
                            {application.rejectionReason}
                        </StatusAlert>
                    )}

                <StatusActions>
                    {application.status === "approved" && (
                        <Button onClick={onGoCabinet}>Перейти в бизнес-кабинет</Button>
                    )}
                    {application.status === "needs_revision" && (
                        <Button onClick={onResubmit}>Исправить данные</Button>
                    )}
                    {application.status === "rejected" && (
                        <Button onClick={onResubmit}>Подать новую заявку</Button>
                    )}
                </StatusActions>
            </StatusCard>
        </StatusShell>
    );
}

function getStatusConfig(status: BusinessApplication["status"]) {
    switch (status) {
        case "pending":
            return {
                title: "Профиль активируется",
                text: "Данные получены. Профессиональный профиль будет доступен после обновления страницы.",
                icon: (
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                    >
                        <circle
                            cx="12"
                            cy="12"
                            r="9"
                            stroke="currentColor"
                            strokeWidth="2"
                        />
                        <path
                            d="M12 7v5l3 2"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                ),
            };
        case "approved":
            return {
                title: "Профессиональный аккаунт активирован",
                text: "Всё готово. Теперь вы можете работать с клиентами и заявками в профессиональном кабинете.",
                icon: (
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                    >
                        <circle
                            cx="12"
                            cy="12"
                            r="9"
                            stroke="currentColor"
                            strokeWidth="2"
                        />
                        <path
                            d="m8 12 3 3 5-6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                ),
            };
        case "needs_revision":
            return {
                title: "Нужны дополнительные данные",
                text: "Мы не смогли завершить активацию. Проверьте информацию ниже и отправьте заявку повторно.",
                icon: (
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                    >
                        <circle
                            cx="12"
                            cy="12"
                            r="9"
                            stroke="currentColor"
                            strokeWidth="2"
                        />
                        <path
                            d="M12 8v5m0 3h0"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
                ),
            };
        case "rejected":
            return {
                title: "Заявка отклонена",
                text: "Сейчас мы не можем активировать аккаунт по указанным данным. Вы можете обновить информацию и отправить новую заявку.",
                icon: (
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                    >
                        <circle
                            cx="12"
                            cy="12"
                            r="9"
                            stroke="currentColor"
                            strokeWidth="2"
                        />
                        <path
                            d="m9 9 6 6m0-6-6 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
                ),
            };
        default:
            return { title: "", text: "", icon: null };
    }
}

export default ForBusiness;
