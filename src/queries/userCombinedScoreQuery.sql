WITH LatestDate AS (
    SELECT MAX(createdAt) AS last_date FROM sports_bets
),
UserStats AS (
    SELECT user,
           COUNT(*) AS total_bets,
           SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) AS wins,
           SUM(CASE WHEN status IN ('lost', 'cashout') THEN 1 ELSE 0 END) AS losses,
           ROUND(
               CASE 
                   WHEN SUM(CASE WHEN status IN ('lost', 'cashout') THEN 1 ELSE 0 END) = 0 THEN 
                       CAST(SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) AS REAL)
                   ELSE 
                       CAST(SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) AS REAL) / 
                       CAST(SUM(CASE WHEN status IN ('lost', 'cashout') THEN 1 ELSE 0 END) AS REAL)
               END, 2) AS win_loss_ratio,
           AVG(potentialMultiplier) AS avg_potential_multiplier,
           AVG(amount) AS avg_bet_amount,
           ROUND(((SUM(CASE WHEN status = 'won' THEN amount * potentialMultiplier ELSE 0 END) - SUM(amount)) / SUM(amount)) * 100, 2) AS roi,
           ROUND(SUM(CASE WHEN status = 'won' THEN amount * potentialMultiplier ELSE 0 END) - SUM(amount), 2) AS profit, -- Calcul du profit
           CAST(strftime('%J', MAX(createdAt)) - strftime('%J', MIN(createdAt)) + 1 AS INTEGER) AS betting_days,
           ROUND((COUNT(*) / (CAST(strftime('%J', MAX(createdAt)) - strftime('%J', MIN(createdAt)) + 1 AS INTEGER))), 2) AS avg_bets_per_day,
           MAX(createdAt) AS last_bet_date
    FROM sports_bets
    WHERE status != 'pending'
    GROUP BY user
    HAVING total_bets >= 250 AND win_loss_ratio >= 1 AND total_bets = wins + losses AND avg_potential_multiplier > 1.1 AND roi <= 100 AND avg_bet_amount > 0.02 AND roi >= 5
),
VarianceCalc AS (
    SELECT user,
           SUM((amount * potentialMultiplier - avg_gain_loss) * (amount * potentialMultiplier - avg_gain_loss)) / COUNT(*) AS variance
    FROM sports_bets,
         (SELECT user AS sub_user, AVG(amount * potentialMultiplier - amount) AS avg_gain_loss FROM sports_bets GROUP BY user) subquery
    WHERE sports_bets.user = subquery.sub_user AND status != 'pending'
    GROUP BY user
),
MaxValues AS (
    SELECT MAX(win_loss_ratio) AS max_win_loss_ratio, 
           MAX(total_bets) AS max_total_bets, 
           MAX(roi) AS max_roi,
           MAX(variance) AS max_variance
    FROM UserStats, VarianceCalc
    WHERE UserStats.user = VarianceCalc.user
)

SELECT UserStats.user, 
       total_bets, 
       wins, 
       losses, 
       win_loss_ratio, 
       roi, 
       profit,
       avg_potential_multiplier, 
       avg_bet_amount, 
       avg_bets_per_day,
       VarianceCalc.variance,
       (win_loss_ratio / max_win_loss_ratio * ? + 
        total_bets / max_total_bets * ? + 
        roi / max_roi * ? +
        (1 - variance / max_variance) * 0.25) AS combined_score
FROM UserStats, VarianceCalc, MaxValues, LatestDate
WHERE UserStats.user = VarianceCalc.user
AND CAST(strftime('%J', UserStats.last_bet_date) AS INTEGER) > CAST(strftime('%J', LatestDate.last_date) AS INTEGER) - 15
AND UserStats.user != 'siix'
ORDER BY combined_score DESC
LIMIT ?