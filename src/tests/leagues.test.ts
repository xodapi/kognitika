import { describe, it, expect } from 'vitest';
import { getLeagueFromRating, LEAGUES } from '../lib/leagues';

describe('getLeagueFromRating', () => {
  it('returns BRONZE for rating 0', () => {
    const league = getLeagueFromRating(0);
    expect(league.type).toBe('BRONZE');
  });

  it('returns BRONZE for ratings below 1201', () => {
    expect(getLeagueFromRating(1).type).toBe('BRONZE');
    expect(getLeagueFromRating(1200).type).toBe('BRONZE');
  });

  it('returns SILVER at boundary 1201', () => {
    expect(getLeagueFromRating(1201).type).toBe('SILVER');
  });

  it('returns SILVER for ratings 1201-1500', () => {
    expect(getLeagueFromRating(1300).type).toBe('SILVER');
    expect(getLeagueFromRating(1500).type).toBe('SILVER');
  });

  it('returns GOLD at boundary 1501', () => {
    expect(getLeagueFromRating(1501).type).toBe('GOLD');
  });

  it('returns GOLD for ratings 1501-1800', () => {
    expect(getLeagueFromRating(1600).type).toBe('GOLD');
    expect(getLeagueFromRating(1800).type).toBe('GOLD');
  });

  it('returns PLATINUM at boundary 1801', () => {
    expect(getLeagueFromRating(1801).type).toBe('PLATINUM');
  });

  it('returns PLATINUM for ratings 1801-2100', () => {
    expect(getLeagueFromRating(2000).type).toBe('PLATINUM');
    expect(getLeagueFromRating(2100).type).toBe('PLATINUM');
  });

  it('returns ELITE at boundary 2101', () => {
    expect(getLeagueFromRating(2101).type).toBe('ELITE');
  });

  it('returns ELITE for high ratings', () => {
    expect(getLeagueFromRating(3000).type).toBe('ELITE');
    expect(getLeagueFromRating(99999).type).toBe('ELITE');
  });

  it('returns BRONZE for negative ratings', () => {
    expect(getLeagueFromRating(-1).type).toBe('BRONZE');
    expect(getLeagueFromRating(-1000).type).toBe('BRONZE');
  });

  it('all leagues are in descending minRating order', () => {
    for (let i = 1; i < LEAGUES.length; i++) {
      expect(LEAGUES[i - 1].minRating).toBeGreaterThan(LEAGUES[i].minRating);
    }
  });

  it('every league type has unique minRating', () => {
    const ratings = LEAGUES.map((l) => l.minRating);
    expect(new Set(ratings).size).toBe(ratings.length);
  });
});
