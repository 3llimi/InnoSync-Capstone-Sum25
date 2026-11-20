import joblib
from synthetic_data import extract_team_features_rich


def hybrid_team_selection(candidates, project, roles, recommender, model_path="team_quality_model.joblib", n_teams=10,
                          seed=0, exclude_ids=None, keep_ids=None, return_entries=False):
    """
    Select the best team using a hybrid approach: generate candidate teams with the simple recommender, then use the ML model to pick the best.
    Args:
        candidates: List of Member objects
        project: Project object
        roles: List of Role objects
        recommender: TeamRecommender instance
        model_path: Path to the trained ML model
        n_teams: Number of candidate teams to generate
        seed: First random seed. The default (0) keeps the original, repeatable result;
              a reroll passes a fresh seed so a different set of candidate teams is explored.
        exclude_ids / keep_ids: passed to the recommender (see TeamRecommender._recommend_team)
        return_entries: also return the chosen team's entries ({'member', 'role', 'role_match_score'}),
              so callers can tell which role each person was picked for.
    Returns:
        best_team: List of Member objects (the best team)
        best_score: Predicted score of the best team
        (best_entries, only when return_entries=True)
    """
    candidate_teams = []
    candidate_entries = []
    for i in range(n_teams):
        # Use different random seed for each iteration to get different teams
        team = recommender._recommend_team(project, roles, random_seed=seed + i,
                                           exclude_ids=exclude_ids, keep_ids=keep_ids)
        team_members = [m['member'] for m in team["team"]]
        candidate_teams.append(team_members)
        candidate_entries.append(team["team"])

    model = joblib.load(model_path)
    features = [extract_team_features_rich(team, roles, project) for team in candidate_teams]
    scores = model.predict(features)
    best_idx = scores.argmax()
    if return_entries:
        return candidate_teams[best_idx], scores[best_idx], candidate_entries[best_idx]
    return candidate_teams[best_idx], scores[best_idx] 