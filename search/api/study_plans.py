"""Study plans and sutta search API routes."""

from fastapi import APIRouter, Query as QParam, HTTPException
from search.api.models import (
    StudyPlanSummary, StudyPlanDetail, SuttaSearchResult, SuttaDetail,
)
from search.server.suttas import (
    list_study_plans as _list_plans,
    get_study_plan as _get_plan,
    find_study_plan_by_topic as _find_plans,
    search_suttas as _search_suttas,
    get_sutta as _get_sutta,
    get_similar_suttas as _similar,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Study Plans
# ---------------------------------------------------------------------------

@router.get("/study-plans", response_model=list[StudyPlanSummary], summary="Liste les study plans")
def list_plans(
    theme: str | None = QParam(default=None,
        description="Filtrer par thème: practice, doctrine, ethics, cosmology, community, psychology, narrative, poetry, mixed"),
    nikaya: str | None = QParam(default=None,
        description="Filtrer par nikaya: an, sn, mn, dn, dhp, ud, iti, snp, thag, thig, ja"),
    min_size: int = QParam(default=5, ge=1, description="Taille minimale du cluster"),
    limit: int = QParam(default=50, ge=1, le=200),
):
    """
    Liste tous les study plans disponibles (un par cluster thématique).

    Chaque plan représente un groupe de suttas sémantiquement proches,
    ordonnés du plus simple au plus avancé.
    """
    return _list_plans(theme_category=theme, nikaya=nikaya, min_size=min_size, limit=limit)


@router.get("/study-plans/search", response_model=list[StudyPlanSummary], summary="Trouver un plan par sujet")
def find_plan_by_topic(
    topic: str = QParam(..., description="Sujet à explorer (ex: 'mindfulness', 'dependent origination')", min_length=2),
    limit: int = QParam(default=5, ge=1, le=15),
):
    """
    Trouve les study plans les plus proches d'un sujet donné via recherche sémantique.

    Exemples :
    - `/study-plans/search?topic=breath+meditation`
    - `/study-plans/search?topic=impermanence+suffering`
    - `/study-plans/search?topic=nibbana+liberation`
    """
    results = _find_plans(topic=topic, limit=limit)
    return results


@router.get("/study-plans/{cluster_id}", response_model=StudyPlanDetail, summary="Détail d'un study plan")
def get_plan(cluster_id: int):
    """
    Retourne le study plan complet pour un cluster, avec la liste ordonnée des suttas.

    La séquence est ordonnée du plus simple au plus avancé selon :
    - Longueur du texte (plus court = plus accessible)
    - Nikaya (Ud/Dhp < AN < SN < MN < DN)
    - Score de difficulté canonique (disponible pour DN et MN)
    """
    plan = _get_plan(cluster_id)
    if plan is None:
        raise HTTPException(status_code=404, detail=f"Study plan {cluster_id} non trouvé")
    return plan


# ---------------------------------------------------------------------------
# Sutta Search
# ---------------------------------------------------------------------------

@router.get("/suttas/search", response_model=list[SuttaSearchResult], summary="Recherche dans les suttas")
def search_suttas(
    q: str = QParam(..., description="Requête sémantique (ex: 'what is nibbana?')", min_length=2),
    nikaya: str | None = QParam(default=None, description="Filtrer par nikaya: an, sn, mn, dn, dhp, ud, iti, snp, thag, thig"),
    cluster_id: int | None = QParam(default=None, description="Filtrer par cluster thématique"),
    limit: int = QParam(default=10, ge=1, le=20),
):
    """
    Recherche sémantique dans 4167+ traductions anglaises de Bhikkhu Sujato.

    Exemples :
    - `/suttas/search?q=mindfulness+of+breathing`
    - `/suttas/search?q=the+five+aggregates&nikaya=sn`
    - `/suttas/search?q=loving+kindness+metta&cluster_id=143`
    """
    return _search_suttas(query=q, nikaya=nikaya, cluster_id=cluster_id, limit=limit)


@router.get("/suttas/{sutta_id}", response_model=SuttaDetail, summary="Détail d'un sutta")
def get_sutta(sutta_id: str):
    """
    Récupère les métadonnées d'un sutta par son identifiant (ex: 'mn10', 'sn47.1', 'dn2').

    Inclut le cluster thématique auquel il appartient et le lien SuttaCentral.
    """
    result = _get_sutta(sutta_id.lower())
    if result is None:
        raise HTTPException(status_code=404, detail=f"Sutta '{sutta_id}' non trouvé")
    return result


@router.get("/suttas/{sutta_id}/similar", response_model=list[SuttaSearchResult], summary="Suttas similaires")
def similar_suttas(
    sutta_id: str,
    limit: int = QParam(default=8, ge=1, le=20),
):
    """
    Trouve les suttas les plus proches sémantiquement d'un sutta donné.

    Utile pour explorer un sujet depuis un texte connu.
    Exemple : `/suttas/mn10/similar` → autres suttas sur la pleine conscience
    """
    results = _similar(sutta_id=sutta_id.lower(), limit=limit)
    if not results:
        sutta = _get_sutta(sutta_id.lower())
        if sutta is None:
            raise HTTPException(status_code=404, detail=f"Sutta '{sutta_id}' non trouvé")
    return results
