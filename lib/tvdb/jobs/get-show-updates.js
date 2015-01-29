'use strict';

var Promise = require('bluebird'),
    rek = require('rekuire'),
    logger = rek('lib/logger'),
    Models = rek('lib/models');

module.exports = function () {
    var TVDB = rek('lib/tvdb');

    logger.info('Looking for show updates from tvdb');

    return TVDB.Api
        .getUpdates(1000 * 60 * 60 * 24)
        .then(function (updates) {
            return updates.Series.map(function (tvdbId) {
                return parseInt(tvdbId);
            });
        })
        .then(function (tvdbIds) {
            return Models.Show.find({
                tvdbId: {$in: tvdbIds}
            });
        })
        .then(function (shows) {
            if (shows.length > 0) {
                return Promise.each(shows, function (show) {
                    return TVDB.Api.
                        getSeriesById(show.tvdbId)
                        .then(function (tvdbShow) {
                            return TVDB.Mappers.mapShow(tvdbShow);
                        })
                        .then(function (mappedShow) {
                            return show.update(mappedShow);
                        })
                        .then(function (show) {
                            logger.info('Successfully updated show - ', show.title);
                            return show;
                        });
                });
            }

            return shows;
        })
        .catch(function (error) {
            logger.error('Failed to get tvdb show updates - %s', error.message);
        });
};