import { DISTRO_API, INCLUDE_FOLDING_USER_TYPES } from '../config.js';
import { formatDateForApi } from './format.js';
import { AppError } from './errors.js';

/**
 * Calls the FoldingCash GetDistro API and returns the parsed response.
 * Throws an AppError with a friendly message for every failure mode:
 * network/CORS failures, non-200 responses, API-reported failures, and
 * empty result sets.
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {number|bigint} amount
 */
export async function getDistribution(startDate, endDate, amount) {
  const url = new URL('v1/GetDistro', DISTRO_API);
  url.searchParams.append('startDate', formatDateForApi(startDate));
  url.searchParams.append('endDate', formatDateForApi(endDate));
  url.searchParams.append('amount', amount.toString());
  url.searchParams.append('includeFoldingUserTypes', INCLUDE_FOLDING_USER_TYPES);

  let response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new AppError(
      'network',
      `Could not reach the distribution API at ${DISTRO_API}. This may be a network problem, or the ` +
        'API may not allow requests from this browser app (CORS). Check your connection and try again.',
      { cause, url: url.toString() },
    );
  }

  if (!response.ok) {
    throw new AppError(
      'http',
      `The distribution API returned an unexpected status (HTTP ${response.status}). Please try again.`,
      { status: response.status, url: url.toString() },
    );
  }

  let body;
  try {
    body = await response.json();
  } catch (cause) {
    throw new AppError('parse', 'The distribution API returned a response that could not be understood.', {
      cause,
    });
  }

  if (body.success === false) {
    throw new AppError(
      'api',
      `The distribution API reported a failure${
        body.firstErrorCode ? ` (error code ${body.firstErrorCode})` : ''
      }.`,
      { firstErrorCode: body.firstErrorCode, body },
    );
  }

  if (!body.distroCount || body.distroCount <= 0 || !Array.isArray(body.distro) || body.distro.length === 0) {
    throw new AppError('empty', 'No distribution records were found for the selected date range.', { body });
  }

  return body;
}
